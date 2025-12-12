// 1) این دو مقدار رو از Supabase بگیر و اینجا جایگزین کن:
const SUPABASE_URL = "https://lznrwbrxzgnczfqgamxp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bnJ3YnJ4emduY3pmcWdhbXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjU5MTQsImV4cCI6MjA3OTUwMTkxNH0.lHjgbKJ90Mws5z5-jzJYqAoyRgjfMGikmJTuAi1Nxqk";

// توجه: فقط anon key (public) — سرویس رول رو داخل سایت نذار
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showError(msg) {
  const el = document.getElementById("media-error");
  if (!el) return;
  el.style.display = "block";
  el.textContent = msg;
}

function resolveImgUrl(path) {
  if (!path) return "";
  const p = String(path).trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return p; // چون عکس‌ها کنار index.html هستند، همین کافیه (مثل img4.png)
}

function groupImagesByPostId(images) {
  const map = {};
  for (const img of images || []) {
    const key = String(img.post_id);
    if (!map[key]) map[key] = [];
    map[key].push(img);
  }
  return map;
}

function render(posts, imagesByPost) {
  const root = document.getElementById("media-posts");
  if (!root) return;

  root.innerHTML = "";

  if (!posts || posts.length === 0) {
    root.innerHTML = "<p>هنوز پستی ثبت نشده.</p>";
    return;
  }

  for (const post of posts) {
    const wrap = document.createElement("div");
    wrap.style.border = "1px solid #ddd";
    wrap.style.borderRadius = "12px";
    wrap.style.padding = "12px";
    wrap.style.margin = "12px 0";

    const title = document.createElement("h3");
    title.textContent = post.title || "بدون عنوان";
    title.style.margin = "0 0 8px 0";

    const cap = document.createElement("p");
    cap.textContent = post.caption || "";
    cap.style.margin = "0 0 12px 0";

    wrap.appendChild(title);
    if (post.caption) wrap.appendChild(cap);

    const imgs = imagesByPost[String(post.id)] || [];
    if (imgs.length) {
      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
      grid.style.gap = "10px";

      for (const img of imgs) {
        const fig = document.createElement("figure");
        fig.style.margin = "0";

        const imageEl = document.createElement("img");
        imageEl.src = resolveImgUrl(img.file_path);
        imageEl.alt = img.caption || post.title || "media";
        imageEl.style.width = "100%";
        imageEl.style.borderRadius = "10px";
        imageEl.style.display = "block";

        fig.appendChild(imageEl);

        if (img.caption) {
          const fc = document.createElement("figcaption");
          fc.textContent = img.caption;
          fc.style.fontSize = "13px";
          fc.style.opacity = "0.85";
          fc.style.marginTop = "6px";
          fig.appendChild(fc);
        }

        grid.appendChild(fig);
      }

      wrap.appendChild(grid);
    } else {
      const empty = document.createElement("p");
      empty.textContent = "برای این پست هنوز عکسی ثبت نشده.";
      empty.style.opacity = "0.7";
      empty.style.margin = "0";
      wrap.appendChild(empty);
    }

    root.appendChild(wrap);
  }
}

async function loadMedia() {
  try {
    const { data: posts, error: postsErr } = await sb
      .from("media_posts")
      .select("id,title,caption,order_index,created_at")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (postsErr) {
      showError("خطا در گرفتن پست‌ها: " + postsErr.message);
      return;
    }

    const postIds = (posts || []).map(p => p.id);
    let imagesByPost = {};

    if (postIds.length) {
      const { data: images, error: imgErr } = await sb
        .from("media_images")
        .select("id,post_id,file_path,caption,order_index,created_at")
        .in("post_id", postIds)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

      if (imgErr) {
        // اگر تصاویر خطا دادن، حداقل پست‌ها رو نمایش می‌دیم
        console.warn("images error:", imgErr);
      } else {
        imagesByPost = groupImagesByPostId(images);
      }
    }

    render(posts, imagesByPost);
  } catch (e) {
    showError("خطای غیرمنتظره: " + (e?.message || String(e)));
  }
}

document.addEventListener("DOMContentLoaded", loadMedia);
