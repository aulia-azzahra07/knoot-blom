import { supabase } from "../lib/supabase";

const LEGACY_AUTH_KEYS = [
  "kb_role",
  "kb_user",
  "kb_auth",
  "kb_current_user",
  "kb_is_logged_in",
  "currentUser",
  "role",
  "isLoggedIn",
  "loggedInUser",
  "authUser",
];

/**
 * Hapus sisa key login/peran lama buatan aplikasi di localStorage/sessionStorage.
 * TIDAK menyentuh key sesi resmi Supabase (sb-*-auth-token) maupun keranjang (kb_cart).
 */
export const clearLegacyAuthStorage = () => {
  try {
    LEGACY_AUTH_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch (e) {
    console.warn("[Auth] Gagal membersihkan legacy storage:", e.message);
  }
};

/**
 * Cek role user dari tabel `admin_users` HANYA setelah ada sesi Supabase yang valid.
 * Jika user_id ada di `admin_users` -> 'admin', selain itu -> 'customer'.
 */
const resolveRoleForUserId = async (userId) => {
  if (!userId) return null;

  let role = "customer";
  try {
    const { data: adminRow, error: adminErr } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminErr) {
      console.warn("[Auth] Gagal cek admin_users (mungkin RLS):", adminErr.message);
      const { data: allAdmins, error: allErr } = await supabase
        .from("admin_users")
        .select("user_id");
      if (!allErr && Array.isArray(allAdmins)) {
        if (allAdmins.some((row) => row.user_id === userId)) role = "admin";
      }
    } else {
      role = adminRow ? "admin" : "customer";
    }
  } catch (e) {
    console.error("[Auth] Error saat cek admin_users:", e.message);
  }

  return role;
};

/**
 * Bangun profil user + role dari objek session Supabase.
 * Mengembalikan null (guest) jika tidak ada sesi valid.
 */
export const resolveUserProfileFromSession = async (session) => {
  const user = session?.user;
  if (!user) return null;

  const role = await resolveRoleForUserId(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Pengguna",
    phone: user.user_metadata?.phone || "",
    address: user.user_metadata?.address || "",
    role,
    avatar:
      role === "admin"
        ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
        : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  };
};

/**
 * Login customer/admin via Supabase Auth.
 * Role ditentukan dari tabel admin_users (bukan dari email/pilihan manual).
 */
export const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });

  if (error) {
    console.error("[Auth] Login gagal:", error);
    const msg = translateAuthError(error.message);
    throw new Error(msg);
  }

  return resolveUserProfileFromSession(data.session || { user: data.user });
};

/**
 * Daftar akun customer baru via Supabase Auth.
 */
export const registerUser = async (email, password, fullName, phone, address) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password.trim(),
    options: {
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      },
    },
  });

  if (error) {
    console.error("[Auth] Register gagal:", error);
    throw new Error(translateAuthError(error.message));
  }

  // Supabase mungkin mengirim email konfirmasi — user ada tapi belum dikonfirmasi
  const user = data.user;
  const needsConfirmation = !data.session; // Jika tidak ada session, berarti perlu konfirmasi email

  return {
    user,
    needsConfirmation,
    email: email.trim(),
    name: fullName.trim(),
  };
};

/**
 * Logout user saat ini.
 */
export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[Auth] Logout error:", error.message);
    throw error;
  }
};

/**
 * Ambil sesi awal yang tersimpan di browser via supabase.auth.getSession()
 * lalu tentukan role dari tabel admin_users hanya jika sesi valid.
 * Mengembalikan null jika pengguna adalah guest (belum login).
 */
export const getInitialSessionUser = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user) return null;
    return await resolveUserProfileFromSession(data.session);
  } catch (e) {
    console.warn("[Auth] Gagal membaca sesi awal:", e.message);
    return null;
  }
};

/**
 * Alias kompatibilitas untuk mengambil user + role dari sesi aktif saat ini.
 */
export const getCurrentUserWithRole = async () => {
  return getInitialSessionUser();
};

/**
 * Terjemahkan pesan error Supabase Auth ke Bahasa Indonesia.
 */
const translateAuthError = (msg = "") => {
  if (msg.includes("Invalid login credentials"))
    return "Email atau kata sandi salah. Periksa kembali dan coba lagi.";
  if (msg.includes("Email not confirmed"))
    return "Email kamu belum dikonfirmasi. Cek inbox/spam dan klik link verifikasi.";
  if (msg.includes("User already registered"))
    return "Email ini sudah terdaftar. Coba login atau gunakan email lain.";
  if (msg.includes("Password should be at least"))
    return "Kata sandi minimal 6 karakter.";
  if (msg.includes("Unable to validate email address"))
    return "Format email tidak valid.";
  if (msg.includes("signup is disabled"))
    return "Pendaftaran akun baru sedang dinonaktifkan. Hubungi admin toko.";
  if (msg.includes("rate limit"))
    return "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.";
  return msg || "Terjadi kesalahan autentikasi. Silakan coba lagi.";
};
