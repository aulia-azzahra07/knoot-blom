import { supabase } from "../lib/supabase";

/**
 * Login customer/admin via Supabase Auth.
 * Role ditentukan dari tabel admin_users (bukan dari email/pilihan manual).
 */
export const loginUser = async (email, password) => {
  // 1. Login via Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });

  if (error) {
    console.error("[Auth] Login gagal:", error);
    // Terjemahkan pesan error Supabase ke bahasa Indonesia
    const msg = translateAuthError(error.message);
    throw new Error(msg);
  }

  const user = data.user;

  // 2. Cek apakah user ada di tabel admin_users
  let role = "customer";
  try {
    const { data: adminRow, error: adminErr } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminErr) {
      console.warn("[Auth] Gagal cek admin_users (mungkin RLS):", adminErr.message);
      // Fallback: coba tanpa filter (ambil semua lalu cek manual)
      const { data: allAdmins, error: allErr } = await supabase
        .from("admin_users")
        .select("user_id");
      if (!allErr && Array.isArray(allAdmins)) {
        const isAdmin = allAdmins.some((row) => row.user_id === user.id);
        if (isAdmin) role = "admin";
        console.log("[Auth] Fallback admin check:", isAdmin ? "ADMIN" : "CUSTOMER");
      } else {
        console.warn("[Auth] Fallback juga gagal:", allErr?.message);
      }
    } else {
      role = adminRow ? "admin" : "customer";
    }
  } catch (e) {
    console.error("[Auth] Error saat cek admin_users:", e.message);
  }
  console.log("[Auth] Role resolved:", role, "for user:", user.id);

  const userProfile = {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email.split("@")[0],
    phone: user.user_metadata?.phone || "",
    address: user.user_metadata?.address || "",
    role,
    avatar:
      role === "admin"
        ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
        : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  };

  return userProfile;
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
 * Ambil user yang sedang login + cek role-nya.
 * Dipanggil saat app pertama kali dimuat (onAuthStateChange).
 */
export const getCurrentUserWithRole = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  let role = "customer";
  try {
    const { data: adminRow, error: adminErr } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminErr) {
      console.warn("[Auth] getCurrentUserWithRole - Gagal cek admin_users:", adminErr.message);
      // Fallback: ambil semua lalu cek manual
      const { data: allAdmins, error: allErr } = await supabase
        .from("admin_users")
        .select("user_id");
      if (!allErr && Array.isArray(allAdmins)) {
        if (allAdmins.some((row) => row.user_id === user.id)) role = "admin";
      }
    } else {
      role = adminRow ? "admin" : "customer";
    }
  } catch (e) {
    console.error("[Auth] Error cek role:", e.message);
  }
  console.log("[Auth] getCurrentUserWithRole - Role:", role, "ID:", user.id);

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email.split("@")[0],
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
