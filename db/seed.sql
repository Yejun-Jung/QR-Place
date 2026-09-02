-- 데모 시드 데이터

INSERT INTO users (id, kakao_id, nickname) VALUES
  (1, 'kakao_1', '민준'),
  (2, 'kakao_2', '서연')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, kakao_place_id, name, latitude, longitude) VALUES
  (1, 'place_1', '김가네 한식당', 37.5665, 126.9780)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menus (id, store_id, name, price, description, tags) VALUES
  (1, 1, '김치찌개',   9000,  '얼큰한 김치찌개',   '{"category":"찌개","spicy":3,"price_range":"mid"}'),
  (2, 1, '된장찌개',   8000,  '구수한 된장찌개',   '{"category":"찌개","spicy":1,"price_range":"mid"}'),
  (3, 1, '제육볶음',   11000, '매콤한 제육볶음',   '{"category":"볶음","spicy":4,"price_range":"mid"}'),
  (4, 1, '불닭볶음',   12000, '아주 매운 불닭',    '{"category":"볶음","spicy":5,"price_range":"mid"}'),
  (5, 1, '계란말이',   6000,  '부드러운 계란말이', '{"category":"반찬","spicy":0,"price_range":"low"}'),
  (6, 1, '물냉면',     9500,  '시원한 물냉면',     '{"category":"면","spicy":0,"price_range":"mid"}'),
  (7, 1, '갈비탕',     13000, '진한 갈비탕',       '{"category":"탕","spicy":0,"price_range":"high"}'),
  (8, 1, '비빔밥',     9000,  '나물 비빔밥',       '{"category":"밥","spicy":2,"price_range":"mid"}')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq',  (SELECT MAX(id) FROM users));
SELECT setval('stores_id_seq', (SELECT MAX(id) FROM stores));
SELECT setval('menus_id_seq',  (SELECT MAX(id) FROM menus));

-- user 1(민준): 매운 찌개/볶음 취향
-- user 2(서연): 담백한 탕/면 취향
-- NULL: 비로그인 주문 (인기 메뉴 집계용)
INSERT INTO view_logs (user_id, table_number, store_id, menu_id, action_type, created_at) VALUES
  (1,    'A1', 1, 1, 'order', NOW() - INTERVAL '2 days'),
  (1,    'A1', 1, 3, 'order', NOW() - INTERVAL '2 days'),
  (1,    'A1', 1, 4, 'view',  NOW() - INTERVAL '2 days'),
  (1,    'A3', 1, 3, 'view',  NOW() - INTERVAL '10 days'),
  (1,    'A3', 1, 1, 'view',  NOW() - INTERVAL '10 days'),
  (2,    'B2', 1, 7, 'order', NOW() - INTERVAL '1 day'),
  (2,    'B2', 1, 6, 'order', NOW() - INTERVAL '1 day'),
  (NULL, 'C1', 1, 1, 'order', NOW() - INTERVAL '3 days'),
  (NULL, 'C4', 1, 6, 'order', NOW() - INTERVAL '5 days'),
  (NULL, 'C4', 1, 8, 'view',  NOW() - INTERVAL '5 days'),
  (NULL, 'C7', 1, 1, 'order', NOW() - INTERVAL '6 days');

INSERT INTO orders (id, store_id, user_id, table_number, status, payment_method, total_amount, created_at, paid_at) VALUES
  (1, 1, 1,    'A1', 'paid', 'card',     20000, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  (2, 1, 2,    'B2', 'paid', 'kakaopay', 22500, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day'),
  (3, 1, NULL, 'C7', 'paid', 'counter',  9000,  NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, menu_id, name, price, quantity) VALUES
  (1, 1, 1, '김치찌개', 9000,  1),
  (2, 1, 3, '제육볶음', 11000, 1),
  (3, 2, 7, '갈비탕',   13000, 1),
  (4, 2, 6, '물냉면',   9500,  1),
  (5, 3, 1, '김치찌개', 9000,  1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));
SELECT setval('order_items_id_seq', (SELECT MAX(id) FROM order_items));
