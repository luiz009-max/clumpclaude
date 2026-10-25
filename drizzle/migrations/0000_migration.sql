create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created_admin after insert on auth.users
  for each row execute function public.handle_first_admin();

create table public.store_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Doce Encanto',
  slogan text not null default 'Um pedacinho de felicidade em cada doce.',
  logo_url text,
  banner_url text default '/images/hero.jpg',
  whatsapp text not null default '5511999999999',
  instagram text default 'doceencanto',
  address text default 'Rua das Flores, 123 - Centro',
  phone text default '(11) 99999-9999',
  primary_color text default '#d98ca0',
  hours jsonb not null default '[{"day":0,"open":"13:00","close":"19:00","closed":false},{"day":1,"open":"10:00","close":"20:00","closed":true},{"day":2,"open":"10:00","close":"20:00","closed":false},{"day":3,"open":"10:00","close":"20:00","closed":false},{"day":4,"open":"10:00","close":"20:00","closed":false},{"day":5,"open":"10:00","close":"21:00","closed":false},{"day":6,"open":"10:00","close":"21:00","closed":false}]'::jsonb,
  open_mode text not null default 'auto',
  min_delivery numeric not null default 30,
  pickup_slots text[] not null default array['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'],
  first_order_coupon text default 'BEMVINDO10',
  promo_banner text default 'Combo Casal com 15% OFF só hoje!',
  promo_ends_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "public read settings" on public.store_settings for select to anon, authenticated using (true);
create policy "admin update settings" on public.store_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.store_settings (id, promo_ends_at) values (1, now() + interval '3 days');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text not null default 'Doces e sobremesas',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read categories" on public.categories for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin write categories" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price numeric not null default 0,
  promo_price numeric,
  size_label text,
  image_url text,
  badge text,
  available boolean not null default true,
  active boolean not null default true,
  featured boolean not null default false,
  sales_count int not null default 0,
  options jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin write products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee numeric not null default 0,
  active boolean not null default true
);
grant select on public.neighborhoods to anon, authenticated;
grant insert, update, delete on public.neighborhoods to authenticated;
grant all on public.neighborhoods to service_role;
alter table public.neighborhoods enable row level security;
create policy "public read neighborhoods" on public.neighborhoods for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin write neighborhoods" on public.neighborhoods for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null default 'percent',
  value numeric not null default 0,
  min_order numeric not null default 0,
  first_order_only boolean not null default false,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "admin coupons" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number serial,
  customer_name text not null,
  phone text not null,
  mode text not null,
  address jsonb,
  pickup_time text,
  items jsonb not null,
  subtotal numeric not null,
  delivery_fee numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null,
  payment_method text not null,
  change_for numeric,
  coupon_code text,
  notes text,
  status text not null default 'Recebido',
  created_at timestamptz not null default now()
);
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "admin orders" on public.orders for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
alter publication supabase_realtime add table public.orders;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating int not null default 5,
  text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "public read reviews" on public.reviews for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin write reviews" on public.reviews for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "admin read images" on storage.objects for select to authenticated using (bucket_id = 'images' and public.has_role(auth.uid(),'admin'));
create policy "admin upload images" on storage.objects for insert to authenticated with check (bucket_id = 'images' and public.has_role(auth.uid(),'admin'));
create policy "admin update images" on storage.objects for update to authenticated using (bucket_id = 'images' and public.has_role(auth.uid(),'admin'));
create policy "admin delete images" on storage.objects for delete to authenticated using (bucket_id = 'images' and public.has_role(auth.uid(),'admin'));

insert into public.categories (name, group_name, sort_order) values
('Fatias de bolo recheado','Bolos e fatias',1),('Bolo de pote','Bolos e fatias',2),('Bolo gelado','Bolos e fatias',3),('Bolos inteiros','Bolos e fatias',4),('Bolos personalizados','Bolos e fatias',5),
('Brigadeiros gourmet','Doces e sobremesas',6),('Brownies','Doces e sobremesas',7),('Cookies','Doces e sobremesas',8),('Pudins','Doces e sobremesas',9),('Tortas','Doces e sobremesas',10),('Mousses','Doces e sobremesas',11),('Copos da felicidade','Doces e sobremesas',12),('Morango do amor','Doces e sobremesas',13),
('Combo individual','Combos e promoções',14),('Combo casal','Combos e promoções',15),('Caixa de doces','Combos e promoções',16),('Kits para presente','Combos e promoções',17),('Promoções especiais','Combos e promoções',18),
('Refrigerantes','Bebidas',19),('Sucos','Bebidas',20),('Cafés','Bebidas',21),('Chocolate quente','Bebidas',22);

insert into public.products (category_id, name, description, price, promo_price, size_label, image_url, badge, featured, sales_count, options, sort_order)
select c.id, p.name, p.descr, p.price, p.promo, p.size, p.img, p.badge, p.featured, p.sales, p.opts::jsonb, p.ord
from (values
('Fatias de bolo recheado','Fatia Chocolate Trufado','Massa de chocolate 50% cacau, recheio de brigadeiro cremoso e cobertura de ganache com granulado belga.',18.90,null::numeric,'180g','/images/fatia.jpg','mais_vendido',true,240,'[{"name":"Sabor","type":"single","required":true,"choices":[{"label":"Chocolate trufado","price":0},{"label":"Ninho com morango","price":2},{"label":"Red velvet","price":3}]},{"name":"Adicionais","type":"multi","required":false,"choices":[{"label":"Calda extra de chocolate","price":2.5},{"label":"Morangos frescos","price":4},{"label":"Bola de sorvete","price":6}]}]',1),
('Bolo de pote','Bolo de Pote Ninho com Morango','Camadas de pão de ló, creme de leite Ninho e morangos frescos.',16.90,null,'250ml','/images/bolo-pote.jpg','novidade',true,180,'[{"name":"Tamanho","type":"single","required":true,"choices":[{"label":"250ml","price":0},{"label":"400ml","price":6}]},{"name":"Adicionais","type":"multi","required":false,"choices":[{"label":"Nutella","price":4},{"label":"Morangos extras","price":3}]}]',2),
('Bolos inteiros','Bolo Chocolate Belga','Bolo inteiro de chocolate com recheio de brigadeiro belga. Serve até 15 pessoas.',129.90,null,'1,8kg','/images/fatia.jpg',null,false,40,'[{"name":"Tamanho","type":"single","required":true,"choices":[{"label":"1,8kg (15 fatias)","price":0},{"label":"3kg (25 fatias)","price":70}]},{"name":"Recheio","type":"single","required":true,"choices":[{"label":"Brigadeiro","price":0},{"label":"Ninho","price":0},{"label":"Doce de leite","price":0},{"label":"Nutella","price":20}]}]',3),
('Brigadeiros gourmet','Brigadeiros Gourmet (caixa)','Brigadeiros artesanais com chocolate belga em sabores variados.',24.90,null,'6 unidades','/images/brigadeiro.jpg','mais_vendido',true,320,'[{"name":"Quantidade","type":"single","required":true,"choices":[{"label":"6 unidades","price":0},{"label":"12 unidades","price":22},{"label":"25 unidades","price":64}]},{"name":"Sabores","type":"multi","required":false,"choices":[{"label":"Tradicional","price":0},{"label":"Pistache","price":3},{"label":"Ninho","price":0},{"label":"Coco","price":0},{"label":"Frutas vermelhas","price":2}]}]',4),
('Brownies','Brownie Fudge','Brownie denso de chocolate meio amargo com casquinha crocante.',12.90,null,'120g','/images/brownie.jpg',null,false,150,'[{"name":"Cobertura","type":"single","required":false,"choices":[{"label":"Sem cobertura","price":0},{"label":"Ninho","price":3},{"label":"Nutella","price":4},{"label":"Doce de leite","price":3}]}]',5),
('Cookies','Cookie Recheado','Cookie artesanal com gotas de chocolate e recheio cremoso.',11.90,null,'110g','/images/cookie.jpg','novidade',false,90,'[{"name":"Recheio","type":"single","required":true,"choices":[{"label":"Nutella","price":0},{"label":"Doce de leite","price":0},{"label":"Ninho","price":0}]}]',6),
('Pudins','Pudim de Leite','Pudim de leite condensado cremoso com calda de caramelo.',14.90,null,'Fatia 150g','/images/pudim.jpg',null,false,110,'[{"name":"Tamanho","type":"single","required":true,"choices":[{"label":"Fatia","price":0},{"label":"Inteiro (1kg)","price":50}]}]',7),
('Morango do amor','Morango do Amor','Morango gigante envolto em brigadeiro branco e casquinha de caramelo vermelho.',13.90,null,'1 unidade','/images/morango.jpg','mais_vendido',true,280,'[]',8),
('Combo casal','Combo Casal','2 fatias de bolo + 2 brigadeiros + 2 cafés. Perfeito para dividir.',59.90,49.90,'Para 2','/images/fatia.jpg','promocao',true,70,'[]',9),
('Caixa de doces','Caixa Presente Doce Encanto','Caixa elegante com 12 doces finos sortidos e laço dourado.',69.90,null,'12 doces','/images/caixa.jpg','novidade',true,60,'[{"name":"Cartão","type":"single","required":false,"choices":[{"label":"Sem cartão","price":0},{"label":"Cartão personalizado","price":5}]}]',10),
('Combo individual','Combo Individual','1 fatia de bolo + 1 café ou refrigerante.',26.90,22.90,'Individual','/images/cafe.jpg','promocao',false,85,'[{"name":"Bebida","type":"single","required":true,"choices":[{"label":"Café espresso","price":0},{"label":"Refrigerante lata","price":0}]}]',11),
('Cafés','Cappuccino','Cappuccino cremoso com canela.',9.90,null,'200ml','/images/cafe.jpg',null,false,120,'[{"name":"Tamanho","type":"single","required":true,"choices":[{"label":"200ml","price":0},{"label":"300ml","price":3}]}]',12),
('Chocolate quente','Chocolate Quente','Chocolate quente cremoso com chantilly.',12.90,null,'250ml','/images/cafe.jpg',null,false,60,'[]',13),
('Refrigerantes','Refrigerante Lata','Coca-Cola, Guaraná ou Sprite.',6.00,null,'350ml',null,null,false,100,'[{"name":"Sabor","type":"single","required":true,"choices":[{"label":"Coca-Cola","price":0},{"label":"Coca-Cola Zero","price":0},{"label":"Guaraná","price":0},{"label":"Sprite","price":0}]}]',14),
('Sucos','Suco Natural','Suco natural feito na hora.',9.00,null,'300ml',null,null,false,40,'[{"name":"Sabor","type":"single","required":true,"choices":[{"label":"Laranja","price":0},{"label":"Morango","price":1},{"label":"Maracujá","price":0}]}]',15)
) as p(cat,name,descr,price,promo,size,img,badge,featured,sales,opts,ord)
join public.categories c on c.name = p.cat;

insert into public.neighborhoods (name, fee) values ('Centro',5),('Jardim América',7),('Vila Nova',8),('Bela Vista',10);
insert into public.coupons (code, kind, value, min_order, first_order_only) values ('BEMVINDO10','percent',10,0,true),('DOCE5','fixed',5,40,false);
insert into public.reviews (name, rating, text) values
('Mariana S.',5,'O bolo de chocolate trufado é simplesmente divino! Chegou lindo e no horário.'),
('Rafael C.',5,'Encomendei a caixa presente para minha mãe e ela amou. Acabamento impecável.'),
('Juliana P.',5,'Melhor morango do amor da cidade! Já virei cliente fiel.');