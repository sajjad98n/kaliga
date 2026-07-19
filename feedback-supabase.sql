-- کالیگا: فعال‌سازی امن فرم پیشنهادات عمومی
-- این دستور رکوردی را حذف نمی‌کند.

alter table public.feedbacks enable row level security;

-- اجازه ثبت پیام به بازدیدکنندگان سایت
-- اما هیچ اجازه‌ای برای خواندن عمومی پیام‌ها ایجاد نمی‌شود.
drop policy if exists "public can submit feedback" on public.feedbacks;
create policy "public can submit feedback"
on public.feedbacks
for insert
to anon, authenticated
with check (
  char_length(btrim(body)) between 1 and 2000
  and (username is null or char_length(btrim(username)) between 1 and 80)
);

-- اطمینان از اینکه نقش‌های عمومی نمی‌توانند پیام‌ها را بخوانند، ویرایش یا حذف کنند.
revoke select, update, delete on table public.feedbacks from anon, authenticated;
grant insert on table public.feedbacks to anon, authenticated;
