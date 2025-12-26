-- Only adding uniqueness constraint on user_roles (profiles already has one)
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);