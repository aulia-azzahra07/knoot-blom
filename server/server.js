const express = require("express");
const cors = require("cors");
require("dotenv").config();

const supabase = require("./supabase");
const app = express();
app.use(cors());
app.use(express.json());

// Middleware autentikasi khusus Admin (opsional jika token dikirimkan)
const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Silakan login terlebih dahulu."
            });
        }

        const token = authHeader.split(" ")[1];

        // Verifikasi token Supabase
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                message: "Sesi login tidak valid."
            });
        }

        // Periksa apakah user terdaftar sebagai Admin
        const { data: admin, error: adminError } = await supabase
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (adminError) {
            throw adminError;
        }

        if (!admin) {
            return res.status(403).json({
                success: false,
                message: "Akses ditolak. Khusus Admin."
            });
        }

        req.admin = user;
        next();

    } catch (error) {
        console.error("Admin Auth Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Gagal memverifikasi akses Admin."
        });
    }
};

// Tes akses Admin
app.get("/api/admin/check", verifyAdmin, (req, res) => {
    res.json({
        success: true,
        message: "Autentikasi Admin berhasil!",
        admin: req.admin.email
    });
});

// Sistem pembayaran murni Tunai (Cash on Delivery). Payment Gateway dinonaktifkan.
// Tes backend
app.get("/", (req, res) => {
    res.json({
        message: "Knot & Bloom Backend is Running (Cash/Tunai Payment Only)!",
    });
});

// Tes koneksi database Supabase
app.get("/api/test-supabase", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("products")
            .select("id")
            .limit(1);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: "Koneksi Supabase berhasil!",
            database: "Knot & Bloom",
            products: data.length,
        });

    } catch (error) {
        console.error("Supabase Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Koneksi Supabase gagal",
        });
    }
});

// --- PRODUCT HANDLERS ---
const handleGetProducts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("products")
            .select("*, product_variants(*)")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            throw error;
        }

        // Format data agar selaras dengan kebutuhan frontend
        const formattedProducts = data.map((item) => ({
            ...item,
            image: item.image_url,
            originalPrice: item.original_price,
            reviewsCount: item.reviews_count,
            soldCount: item.sold_count,
            tagType: item.tag_type,
            variants: item.product_variants || [],
        }));

        res.json({
            success: true,
            products: formattedProducts,
        });
    } catch (error) {
        console.error("Fetch Products Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Gagal mengambil data produk",
        });
    }
};

const handleAddProduct = async (req, res) => {
    try {
        const body = req.body;
        const slug = body.slug || (body.name || "produk").toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const productPayload = {
            name: body.name,
            slug: slug,
            category: body.category || "aksesoris",
            price: Number(body.price) || 15000,
            original_price: Number(body.originalPrice || body.original_price || body.price) || 15000,
            stock: Number(body.stock) || 1,
            description: body.description || "",
            image_url: body.image || body.image_url || "/images/tulip-keychain.jpg",
            images: body.images || [body.image || "/images/tulip-keychain.jpg"],
            colors: body.colors || [],
            specs: body.specs || {},
            tag: body.tag || null,
            tag_type: body.tagType || body.tag_type || null,
            rating: body.rating || 5.0,
            reviews_count: body.reviewsCount || 0,
            sold_count: body.soldCount || 0,
            note: body.note || "",
            sort_order: Number(body.sort_order) || 10,
            is_active: true
        };

        const { data: newProduct, error: pErr } = await supabase
            .from("products")
            .insert(productPayload)
            .select()
            .single();

        if (pErr) throw pErr;

        // Simpan varian jika ada
        if (Array.isArray(body.variants) && body.variants.length > 0) {
            const variantsPayload = body.variants.map((v) => ({
                product_id: newProduct.id,
                name: v.name || "Default",
                color_hex: v.color_hex || v.hex || "#FF86C1",
                stock: Number(v.stock) || 1,
                is_active: true
            }));

            await supabase.from("product_variants").insert(variantsPayload);
        }

        res.json({
            success: true,
            product: {
                ...newProduct,
                image: newProduct.image_url,
                originalPrice: newProduct.original_price,
                variants: body.variants || []
            }
        });
    } catch (err) {
        console.error("Add Product Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

const handleUpdateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const updatePayload = {
            name: body.name,
            category: body.category,
            price: Number(body.price),
            original_price: Number(body.originalPrice || body.original_price || body.price),
            stock: Number(body.stock),
            description: body.description,
            image_url: body.image || body.image_url,
            images: body.images,
            colors: body.colors,
            specs: body.specs,
            tag: body.tag,
            tag_type: body.tagType || body.tag_type,
            note: body.note
        };

        // Hapus property yang undefined
        Object.keys(updatePayload).forEach((k) => updatePayload[k] === undefined && delete updatePayload[k]);

        const { data: updatedProduct, error: pErr } = await supabase
            .from("products")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();

        if (pErr) throw pErr;

        res.json({
            success: true,
            product: {
                ...updatedProduct,
                image: updatedProduct.image_url,
                originalPrice: updatedProduct.original_price
            }
        });
    } catch (err) {
        console.error("Update Product Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

const handleDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from("products")
            .update({ is_active: false })
            .eq("id", id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Produk berhasil dinonaktifkan/dihapus"
        });
    } catch (err) {
        console.error("Delete Product Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Routing produk untuk toko publik dan admin portal
app.get("/api/products", handleGetProducts);
app.get("/api/admin/products", handleGetProducts);
app.post("/api/products", handleAddProduct);
app.post("/api/admin/products", handleAddProduct);
app.put("/api/products/:id", handleUpdateProduct);
app.put("/api/admin/products/:id", handleUpdateProduct);
app.delete("/api/products/:id", handleDeleteProduct);
app.delete("/api/admin/products/:id", handleDeleteProduct);

// Membuat pesanan baru (Metode Pembayaran Tunai / Cash on Delivery murni)
// Otomatis langsung berstatus "Dikemas" dan status_bayar "belum_dibayar"
app.post("/api/create-transaction", async (req, res) => {
    try {
        const {
            grossAmount,
            firstName,
            customerName,
            phone,
            address,
            cartItems,
            subtotal,
            shippingCost,
            total,
            notes,
            userId,
            user_id
        } = req.body;

        const effectiveName = customerName || firstName || "Customer";
        const effectivePhone = phone || "08123456789";
        const effectiveAddress = address || "Alamat Belum Diisi";
        const effectiveUserId = userId || user_id || null;

        // Verifikasi harga produk non-custom langsung dari tabel `products` di Supabase
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let dbProductsById = {};
        if (Array.isArray(cartItems) && cartItems.length > 0) {
            const validProductIds = [
                ...new Set(
                    cartItems
                        .map((item) => item.id || item.productId)
                        .filter((id) => typeof id === "string" && uuidRegex.test(id))
                )
            ];
            if (validProductIds.length > 0) {
                const { data: dbProducts, error: dbProdErr } = await supabase
                    .from("products")
                    .select("id, name, price")
                    .in("id", validProductIds);
                if (!dbProdErr && Array.isArray(dbProducts)) {
                    dbProductsById = Object.fromEntries(dbProducts.map((p) => [p.id, p]));
                }
            }
        }

        const verifiedCartItems = Array.isArray(cartItems)
            ? cartItems.map((item) => {
                  const rawId = item.id || item.productId;
                  const dbProd = typeof rawId === "string" ? dbProductsById[rawId] : null;
                  const itemPrice = dbProd ? Number(dbProd.price) : (Number(item.price) || 0);
                  const itemQty = Number(item.quantity) || 1;
                  return {
                      ...item,
                      name: dbProd ? dbProd.name : (item.name || item.productName || "Produk Rajut"),
                      price: itemPrice,
                      quantity: itemQty
                  };
              })
            : [];

        const effectiveSubtotal = verifiedCartItems.length > 0
            ? verifiedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
            : (subtotal ? Number(subtotal) : (Number(total || grossAmount) - (shippingCost ? Number(shippingCost) : 0)));
        const effectiveShipping = verifiedCartItems.length > 0
            ? (effectiveSubtotal >= 50000 ? 0 : 5000)
            : (shippingCost ? Number(shippingCost) : 0);
        const effectiveTotal = verifiedCartItems.length > 0
            ? effectiveSubtotal + effectiveShipping
            : Number(total || grossAmount);

        if (!Number.isFinite(effectiveTotal) || effectiveTotal <= 0) {
            return res.status(400).json({
                message: "Nominal pemesanan tidak valid",
            });
        }

        const timestamp = Date.now();
        const orderNumber = `KB-${timestamp.toString().slice(-6)}`;

        // 1. Simpan data order ke tabel Supabase 'orders'
        // Status otomatis langsung "Dirajut" & payment_status "belum_dibayar"
        const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert({
                order_number: orderNumber,
                customer_name: effectiveName,
                phone: effectivePhone,
                address: effectiveAddress + (notes ? ` (Catatan: ${notes})` : ""),
                subtotal: effectiveSubtotal,
                shipping_cost: effectiveShipping,
                total: effectiveTotal,
                payment_method: "COD",
                payment_status: "belum_dibayar",
                order_status: "Dirajut",
                user_id: effectiveUserId
            })
            .select()
            .single();

        if (orderError) {
            console.error("Supabase Order Insert Error:", orderError);
            throw orderError;
        }

        // 2. Simpan rincian barang ke tabel 'order_items' (memakai harga terverifikasi dari DB)
        if (verifiedCartItems.length > 0) {
            const orderItemsPayload = verifiedCartItems.map((item) => {
                const itemQty = Number(item.quantity) || 1;
                const itemPrice = Number(item.price) || 0;
                const rawId = item.id || item.productId;
                const isValidUUID = typeof rawId === "string" && uuidRegex.test(rawId);

                return {
                    order_id: orderData.id,
                    product_id: isValidUUID ? rawId : null,
                    product_name: `${item.name || item.productName || 'Produk Rajut'}${item.selectedColor ? ` - ${item.selectedColor.name || item.selectedColor}` : ''}`,
                    price: itemPrice,
                    quantity: itemQty,
                    subtotal: itemPrice * itemQty
                };
            });

            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(orderItemsPayload);

            if (itemsError) {
                console.error("Supabase Order Items Error:", itemsError);
            }
        }

        // 3. Catat riwayat awal ke order_status_history: Status langsung "Dirajut"
        try {
            await supabase.from("order_status_history").insert({
                order_id: orderData.id,
                status: "Dirajut",
                keterangan: "Pesanan COD berhasil dibuat. Tim Knot & Bloom mulai merajut pesananmu.",
                created_at: new Date().toISOString()
            });
        } catch (histErr) {
            console.warn("Notice: Gagal mencatat order_status_history awal:", histErr.message);
        }

        // 4. Catat entri pembayaran awal (Tunai - Belum Dibayar)
        try {
            await supabase.from("payments").insert({
                order_id: orderData.id,
                provider: "tunai",
                transaction_id: `CASH-${timestamp}`,
                payment_type: "cash",
                transaction_status: "belum_dibayar",
                gross_amount: effectiveTotal
            });
        } catch (paymentErr) {
            console.warn("Notice: Gagal mencatat entri payments:", paymentErr.message);
        }

        return res.json({
            success: true,
            isCash: true,
            orderId: orderData.id,
            orderNumber: orderNumber,
            subtotal: effectiveSubtotal,
            shippingCost: effectiveShipping,
            total: effectiveTotal,
            status: "Dirajut",
            status_bayar: "belum_dibayar",
            message: "Pesanan berhasil dibuat dan otomatis berstatus Dirajut (Metode: COD saat diantar toko)!"
        });

    } catch (error) {
        console.error("Order Creation Error:", error.message);
        res.status(500).json({
            message: "Gagal membuat pesanan: " + error.message,
        });
    }
});

// Endpoint non-tunai dinonaktifkan (Sistem telah beralih 100% ke Pembayaran Tunai / Cash on Delivery)
app.post("/api/midtrans-webhook", (req, res) => {
    res.json({ message: "Metode pembayaran non-tunai dinonaktifkan. Sistem Knot & Bloom menggunakan pembayaran Tunai (COD)." });
});

app.get("/api/orders/check-status/:midtransOrderId", (req, res) => {
    res.json({ success: true, message: "Metode pembayaran Tunai (COD) aktif. Pembayaran dilakukan saat barang tiba." });
});

// Ambil seluruh daftar pesanan (untuk Admin Portal)
app.get("/api/orders", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*), payments(*)")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            orders: data,
        });
    } catch (error) {
        console.error("Fetch Orders Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data pesanan",
        });
    }
});

// Update status pesanan (oleh Admin) dengan Validasi Alur Status Berurutan
// Alur baru: Dirajut -> Packing -> Diantar -> Selesai (atau Dibatalkan)
app.patch("/api/orders/:orderId/status", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, estimasi_antar, pengantar, keterangan, alasan_batal } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status baru wajib disertakan."
            });
        }

        const cleanEstimasi = (estimasi_antar || "").trim();
        const cleanPengantar = (pengantar || "").trim();
        const cleanAlasan = (alasan_batal || "").trim();

        // 1. Utamakan RPC transaksional Supabase (update orders + insert order_status_history atomik)
        try {
            const { data: rpcOrder, error: rpcError } = await supabase.rpc("update_order_status_tx", {
                p_order_id: String(orderId),
                p_new_status: status,
                p_estimasi_antar: cleanEstimasi || null,
                p_pengantar: cleanPengantar || null,
                p_alasan_batal: cleanAlasan || null
            });

            if (!rpcError && rpcOrder) {
                return res.json({
                    success: true,
                    order: rpcOrder,
                    message: `Status pesanan #${orderId} berhasil diubah menjadi "${status}".`
                });
            }

            if (rpcError) {
                const isMissingRpc =
                    rpcError.code === "PGRST202" ||
                    rpcError.code === "42883" ||
                    (rpcError.message || "").toLowerCase().includes("could not find the function");
                if (!isMissingRpc) {
                    return res.status(400).json({
                        success: false,
                        code: 400,
                        message: rpcError.message
                    });
                }
            }
        } catch (rpcErr) {
            console.warn("Notice RPC update_order_status_tx fallback:", rpcErr.message);
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const queryField = uuidRegex.test(orderId) ? "id" : "order_number";

        // Ambil data pesanan saat ini untuk memeriksa status terkini
        const { data: currentOrder, error: findError } = await supabase
            .from("orders")
            .select("id, order_status, estimasi_antar, pengantar, customer_name")
            .eq(queryField, orderId)
            .maybeSingle();

        if (findError) throw findError;
        if (!currentOrder) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: `Pesanan #${orderId} tidak ditemukan.`
            });
        }

        const currentStatus = currentOrder.order_status || "Dirajut";

        // 2. VALIDASI URUTAN STATUS DI SERVER (SERVER-SIDE STATE MACHINE VALIDATION)
        const ALLOWED_TRANSITIONS = {
            "Dirajut": ["Packing", "Dibatalkan"],
            "Packing": ["Diantar", "Dibatalkan"],
            "Diantar": ["Selesai", "Dibatalkan"],
            "Selesai": [],
            "Dibatalkan": []
        };

        const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
        if (!allowedNextStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: `Urutan status tidak valid! Pesanan saat ini berstatus "${currentStatus}" dan tidak dapat diubah menjadi "${status}". Urutan wajib: Dirajut → Packing → Diantar → Selesai.`
            });
        }

        // 3. Validasi input wajib
        if (status === "Dibatalkan" && !cleanAlasan) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: "Alasan pembatalan wajib diisi saat membatalkan pesanan!"
            });
        }

        if (status === "Diantar" && !cleanEstimasi) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: "Estimasi waktu antar wajib diisi saat mengubah status ke 'Diantar'!"
            });
        }

        // 4. Siapkan payload update
        const updatePayload = {
            order_status: status,
            updated_at: new Date().toISOString()
        };

        if (status === "Diantar") {
            updatePayload.estimasi_antar = cleanEstimasi;
            updatePayload.pengantar = cleanPengantar || null;
        } else if (status === "Selesai") {
            updatePayload.payment_status = "dibayar";
        } else if (status === "Dibatalkan") {
            updatePayload.alasan_batal = cleanAlasan;
        }

        const { data: updatedData, error: updateError } = await supabase
            .from("orders")
            .update(updatePayload)
            .eq("id", currentOrder.id)
            .select()
            .maybeSingle();

        if (updateError) throw updateError;

        // 5. Catat riwayat perubahan ke tabel order_status_history
        const historyDesc = keterangan || (
            status === "Packing"
                ? "Rajutan selesai! Pesanan sedang dikemas rapi oleh tim Knot & Bloom dan siap diantar."
                : status === "Diantar"
                ? `Pesanan sedang diantar langsung oleh tim Knot & Bloom. Estimasi tiba: ${cleanEstimasi}${cleanPengantar ? ` (Pengantar: ${cleanPengantar}).` : "."}`
                : status === "Selesai"
                ? "Pesanan telah diterima pembeli dan pembayaran COD tunai telah dibayar lunas."
                : status === "Dibatalkan"
                ? `Pesanan dibatalkan. Alasan: ${cleanAlasan}.`
                : `Status pesanan diubah menjadi ${status}.`
        );

        try {
            await supabase.from("order_status_history").insert({
                order_id: currentOrder.id,
                status: status,
                keterangan: historyDesc,
                created_at: new Date().toISOString()
            });
        } catch (histErr) {
            console.warn("Notice: Gagal mencatat order_status_history:", histErr.message);
        }

        res.json({
            success: true,
            order: updatedData,
            message: `Status pesanan #${orderId} berhasil diubah dari "${currentStatus}" menjadi "${status}".`
        });
    } catch (err) {
        console.error("Update Order Status Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========================================================
// API KHUSUS ROLE CUSTOMER (TRACKING & PESANAN SAYA)
// KEAMANAN: Memfilter berdasarkan user_id dari sesi token login
// ========================================================

/**
 * Middleware untuk memverifikasi token sesi login Customer
 * Mengambil identitas user murni dari Supabase Auth Token
 */
const verifyCustomer = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                code: 401,
                message: "Akses tidak sah. Silakan login terlebih dahulu."
            });
        }

        const token = authHeader.split(" ")[1];

        // 1. Verifikasi token Supabase Auth
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                code: 401,
                message: "Sesi login tidak valid atau telah kedaluwarsa. Silakan login kembali."
            });
        }

        // 2. Verifikasi Role Customer
        const userRole = user.user_metadata?.role || "customer";
        if (userRole !== "customer" && user.email && user.email.includes("admin")) {
            return res.status(403).json({
                success: false,
                code: 403,
                message: "Akses ditolak. Halaman pelacakan ini khusus untuk akun Customer."
            });
        }

        // Simpan data user yang login ke request
        req.user = user;
        next();
    } catch (error) {
        console.error("Customer Auth Middleware Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Gagal memverifikasi autentikasi customer."
        });
    }
};

/**
 * 1. GET /api/customer/orders
 * Halaman "Pesanan Saya":
 * Mengambil daftar SEMUA pesanan yang HANYA milik customer yang sedang login.
 * Urutkan dari yang terbaru (created_at DESC).
 */
app.get("/api/customer/orders", verifyCustomer, async (req, res) => {
    try {
        const loggedInUserId = req.user.id;

        // Query database dengan filter ketat: WHERE user_id = loggedInUserId
        const { data, error } = await supabase
            .from("orders")
            .select(`
                id,
                user_id,
                order_number,
                total,
                order_status,
                payment_status,
                address,
                no_resi,
                kurir,
                created_at,
                order_items (
                    id,
                    product_id,
                    product_name,
                    quantity,
                    price,
                    subtotal
                )
            `)
            .eq("user_id", loggedInUserId)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            count: data ? data.length : 0,
            orders: data || []
        });
    } catch (error) {
        console.error("Customer Orders Fetch Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil daftar pesanan customer."
        });
    }
});

/**
 * 2. GET /api/customer/orders/:orderId
 * Halaman "Detail Tracking":
 * Mengambil detail satu pesanan, rincian barang, kurir/resi, dan timeline riwayat status.
 * KEAMANAN: Memastikan order benar-benar milik loggedInUserId. Jika bukan -> Error 403.
 */
app.get("/api/customer/orders/:orderId", verifyCustomer, async (req, res) => {
    try {
        const loggedInUserId = req.user.id;
        const { orderId } = req.params;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const queryField = uuidRegex.test(orderId) ? "id" : "order_number";

        // 1. Ambil data pesanan
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*, order_items(*), payments(*)")
            .eq(queryField, orderId)
            .maybeSingle();

        if (orderError) throw orderError;

        // Jika pesanan tidak ditemukan di database -> 404 Not Found
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: `Pesanan dengan ID #${orderId} tidak ditemukan.`
            });
        }

        // 2. CEK HAK AKSES KEPEMILIKAN PESANAN (SECURITY CHECK)
        // Mencegah manipulasi URL ID pesanan orang lain
        if (order.user_id && order.user_id !== loggedInUserId) {
            return res.status(403).json({
                success: false,
                code: 403,
                message: "Akses ditolak (403 Forbidden). Anda tidak berhak melihat pesanan milik akun lain."
            });
        }

        // 3. Ambil timeline riwayat status dari order_status_history secara berurutan
        let history = [];
        try {
            const { data: historyData } = await supabase
                .from("order_status_history")
                .select("*")
                .eq("order_id", order.id)
                .order("created_at", { ascending: true });

            if (Array.isArray(historyData) && historyData.length > 0) {
                history = historyData;
            } else {
                // Fallback timeline default jika tabel history belum terisi
                history = [
                    {
                        id: `hist-init-${order.id}`,
                        order_id: order.id,
                        status: "Pesanan Diterima",
                        keterangan: "Pesanan berhasil dibuat dan tercatat di sistem studio.",
                        created_at: order.created_at
                    }
                ];
                if (order.order_status === "processing" || order.order_status === "shipped" || order.order_status === "delivered") {
                    history.push({
                        id: `hist-pack-${order.id}`,
                        order_id: order.id,
                        status: "Dikemas",
                        keterangan: "Produk selesai dirajut dan dikemas dalam gift box.",
                        created_at: order.updated_at || order.created_at
                    });
                }
                if (order.order_status === "shipped" || order.order_status === "delivered") {
                    history.push({
                        id: `hist-ship-${order.id}`,
                        order_id: order.id,
                        status: "Dikirim",
                        keterangan: `Paket diserahkan ke kurir pengiriman (No. Resi: ${order.no_resi || order.tracking_number || '-'}).`,
                        created_at: order.updated_at || order.created_at
                    });
                }
                if (order.order_status === "delivered") {
                    history.push({
                        id: `hist-deliv-${order.id}`,
                        order_id: order.id,
                        status: "Selesai",
                        keterangan: "Pesanan telah sampai dan diterima dengan baik.",
                        created_at: order.updated_at || order.created_at
                    });
                }
            }
        } catch (hErr) {
            console.warn("Notice: order_status_history lookup:", hErr.message);
        }

        res.json({
            success: true,
            order: order,
            history: history
        });
    } catch (err) {
        console.error("Customer Order Detail Error:", err.message);
        res.status(500).json({
            success: false,
            message: "Gagal memuat detail pelacakan pesanan."
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
