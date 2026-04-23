-- Give SUPER ADMIN the same database privileges as DIRECTOR
-- 1. Appraisals - View all
DROP POLICY IF EXISTS "Director can view all appraisals" ON public.appraisals;
CREATE POLICY "Director and Super Admin can view all appraisals" ON public.appraisals FOR
SELECT USING (
    exists (
      select 1
      from public.users
      where id = auth.uid()
        and (
          role = 'DIRECTOR'
          or role = 'SUPER ADMIN'
        )
    )
  );
-- 2. Appraisal Periods - Manage
DROP POLICY IF EXISTS "Director can manage periods" ON public.appraisal_periods;
CREATE POLICY "Director and Super Admin can manage periods" ON public.appraisal_periods FOR ALL USING (
  exists (
    select 1
    from public.users
    where id = auth.uid()
      and (
        role = 'DIRECTOR'
        or role = 'SUPER ADMIN'
      )
  )
);
-- 3. Users View All
DROP POLICY IF EXISTS "Directors can view all users" ON public.users;
CREATE POLICY "Directors and Super Admins can view all users" ON public.users FOR
SELECT USING (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and (
          u.role = 'DIRECTOR'
          or u.role = 'SUPER ADMIN'
        )
    )
  );