<?php
// English description: Handles marketplace cart, checkout, purchases, and order APIs.

if (!function_exists('VNSEEA_MarketOrderMessageText')) {
    function VNSEEA_MarketOrderMessageText($value)
    {
        $value = html_entity_decode((string) $value, ENT_QUOTES, 'UTF-8');
        $value = preg_replace('/<br\s*\/?>/i', ', ', $value);
        $value = strip_tags($value);
        $value = preg_replace('/\s+/u', ' ', $value);

        return trim($value, " \t\n\r\0\x0B,");
    }
}

if (!function_exists('VNSEEA_FormatMarketOrderMessageMoney')) {
    function VNSEEA_FormatMarketOrderMessageMoney($amount)
    {
        global $wo;

        $currency = !empty($wo['config']['currency']) ? $wo['config']['currency'] : 'USD';
        $rule = Wo_GetCurrencyRule($currency);

        return $rule['code'] . Wo_FormatPriceByCurrency($amount, $currency);
    }
}

if (!function_exists('VNSEEA_SendMarketOrderMessage')) {
    function VNSEEA_SendMarketOrderMessage($seller_id, $hash_id, $items, $total, $address)
    {
        global $wo;

        $seller_id = (int) $seller_id;
        $buyer_id = (int) $wo['user']['user_id'];
        if ($seller_id < 1 || $buyer_id < 1 || $seller_id === $buyer_id || empty($items)) {
            return false;
        }

        $buyer_name = VNSEEA_MarketOrderMessageText(!empty($wo['user']['name']) ? $wo['user']['name'] : $wo['user']['username']);
        $phone = VNSEEA_MarketOrderMessageText(!empty($address->phone) ? $address->phone : '');
        $address_parts = array(
            !empty($address->address) ? $address->address : '',
            !empty($address->city) ? $address->city : '',
            !empty($address->zip) ? $address->zip : '',
            !empty($address->country) ? $address->country : '',
        );
        $address_parts = array_values(array_filter(array_map('VNSEEA_MarketOrderMessageText', $address_parts)));

        $lines = array(
            '📦 ĐƠN HÀNG MỚI # ' . VNSEEA_MarketOrderMessageText($hash_id),
            '',
            '👤 Người đặt: ' . $buyer_name,
            '📞 SĐT: ' . $phone,
            '📍 Địa chỉ: ' . implode(', ', $address_parts),
            '',
            '🧾 Sản phẩm:',
        );

        foreach ($items as $item) {
            $product = Wo_GetProduct($item['product_id']);
            $product_name = !empty($product['name'])
                ? VNSEEA_MarketOrderMessageText($product['name'])
                : 'Sản phẩm #' . (int) $item['product_id'];
            $line_total = (float) $item['price'] * (int) $item['units'];
            $lines[] = '- ' . $product_name . ' x' . (int) $item['units'] . ' = ' . VNSEEA_FormatMarketOrderMessageMoney($line_total);
        }

        $lines[] = '';
        $lines[] = '💰 Tổng: ' . VNSEEA_FormatMarketOrderMessageMoney($total);

        return Wo_RegisterMessage(array(
            'from_id' => $buyer_id,
            'to_id' => $seller_id,
            'time' => time(),
            'text' => Wo_Secure(implode("\n", $lines)),
        ));
    }
}

if (!function_exists('VNSEEA_MarketCheckoutPrice')) {
    function VNSEEA_MarketCheckoutPrice($product)
    {
        global $wo;

        $price = (float)$product->price;
        $currency = (string)$product->currency;
        if (!empty($currency) &&
            !empty($wo['currencies'][$currency]['text']) &&
            !empty($wo['config']['exchange'][$wo['currencies'][$currency]['text']])) {
            $price /= (float)$wo['config']['exchange'][$wo['currencies'][$currency]['text']];
        }
        return $price;
    }
}

if (!function_exists('VNSEEA_NewMarketOrderHash')) {
    function VNSEEA_NewMarketOrderHash()
    {
        try {
            return bin2hex(random_bytes(16));
        } catch (Exception $exception) {
            return uniqid((string)mt_rand(11111, 999999), true);
        }
    }
}

if (!function_exists('VNSEEA_InsertMarketOrderRequestMessage')) {
    function VNSEEA_InsertMarketOrderRequestMessage($buyer_id, $seller_id, $hash_id, $time)
    {
        global $db;

        return $db->insert(T_MESSAGES, array(
            'from_id' => (int)$buyer_id,
            'to_id' => (int)$seller_id,
            'time' => (int)$time,
            'text' => Wo_Secure('Yêu cầu mua #' . $hash_id),
            'type_two' => 'market_order_request',
            'market_order_hash' => (string)$hash_id,
        ));
    }
}

if (!function_exists('VNSEEA_MarketRequestOrder')) {
    function VNSEEA_MarketRequestOrder()
    {
        global $wo, $db;

        marketRequestOrderValidation();

        $buyer_id = (int)$wo['user']['user_id'];
        $product_ids = array_map('intval', $wo['request_product_ids']);
        sort($product_ids, SORT_NUMERIC);
        $product_id_sql = implode(',', $product_ids);
        $now = time();
        $post_commit = array();
        $response_orders = array();
        $removed_product_ids = array();

        $db->startTransaction();
        try {
            $cart_rows = $db->rawQuery(
                'SELECT * FROM ' . T_USERCARD . ' WHERE `user_id` = ' . $buyer_id .
                ' AND `product_id` IN (' . $product_id_sql . ') FOR UPDATE'
            );
            if (count($cart_rows) !== count($product_ids)) {
                throw new Exception('selected cart items not found');
            }

            $product_rows = $db->rawQuery(
                'SELECT * FROM ' . T_PRODUCTS . ' WHERE `id` IN (' . $product_id_sql .
                ') ORDER BY `id` ASC FOR UPDATE'
            );
            $products_by_id = array();
            foreach ($product_rows as $product_row) {
                $products_by_id[(int)$product_row->id] = $product_row;
            }

            $items_by_seller = array();
            foreach ($cart_rows as $cart_row) {
                $product_id = (int)$cart_row->product_id;
                $product = isset($products_by_id[$product_id]) ? $products_by_id[$product_id] : null;
                $quantity = max(1, (int)$cart_row->units);
                if (empty($product) || (int)$product->active !== 1 || (int)$product->status !== 0) {
                    throw new Exception('product not found');
                }
                if ((int)$product->user_id === $buyer_id) {
                    throw new Exception('you can not order your own product');
                }
                if ((int)$product->units < $quantity) {
                    throw new Exception('max qty is ' . (int)$product->units);
                }
                $seller_id = (int)$product->user_id;
                if (!isset($items_by_seller[$seller_id])) {
                    $items_by_seller[$seller_id] = array();
                }
                $items_by_seller[$seller_id][] = array(
                    'product_id' => $product_id,
                    'name' => (string)$product->name,
                    'price' => VNSEEA_MarketCheckoutPrice($product),
                    'units' => $quantity,
                );
            }
            if (empty($items_by_seller)) {
                throw new Exception('no items found');
            }

            foreach ($items_by_seller as $seller_id => $items) {
                $hash_id = VNSEEA_NewMarketOrderHash();
                $total = 0;
                $first_name = '';
                foreach ($items as $item) {
                    $line_total = (float)$item['price'] * (int)$item['units'];
                    $total += $line_total;
                    if ($first_name === '') {
                        $first_name = $item['name'];
                    }
                    $order_id = $db->insert(T_USER_ORDERS, array(
                        'user_id' => $buyer_id,
                        'product_owner_id' => (int)$seller_id,
                        'product_id' => (int)$item['product_id'],
                        'price' => $line_total,
                        'commission' => 0,
                        'final_price' => $line_total,
                        'hash_id' => $hash_id,
                        'units' => (int)$item['units'],
                        'status' => 'placed',
                        'order_flow' => 'request',
                        'stock_reserved' => 0,
                        'address_id' => (int)$wo['address']->id,
                        'time' => $now,
                    ));
                    if (empty($order_id)) {
                        throw new Exception('order insert failed');
                    }
                    $removed_product_ids[(int)$item['product_id']] = true;
                }

                $purchase_id = $db->insert(T_PURCHAES, array(
                    'user_id' => $buyer_id,
                    'order_hash_id' => $hash_id,
                    'price' => $total,
                    'data' => json_encode(array('name' => $first_name), JSON_UNESCAPED_UNICODE),
                    'commission' => 0,
                    'final_price' => $total,
                    'time' => $now,
                ));
                if (empty($purchase_id)) {
                    throw new Exception('purchase summary insert failed');
                }

                $notification_id = $db->insert(T_NOTIFICATION, array(
                    'notifier_id' => $buyer_id,
                    'recipient_id' => (int)$seller_id,
                    'type' => 'new_orders',
                    'url' => 'index.php?link1=orders',
                    'time' => $now,
                ));
                if (empty($notification_id)) {
                    throw new Exception('notification insert failed');
                }

                $message_id = VNSEEA_InsertMarketOrderRequestMessage(
                    $buyer_id,
                    (int)$seller_id,
                    $hash_id,
                    $now
                );
                if (empty($message_id)) {
                    throw new Exception('order message insert failed');
                }

                $post_commit[] = array(
                    'seller_id' => (int)$seller_id,
                    'message_id' => (int)$message_id,
                    'notification_id' => (int)$notification_id,
                );
                $response_orders[] = array(
                    'hash_id' => $hash_id,
                    'seller_id' => (string)$seller_id,
                    'message_id' => (string)$message_id,
                );
            }

            $cart_deleted = $db->where('user_id', $buyer_id)
                ->where('product_id', array_keys($removed_product_ids), 'IN')
                ->delete(T_USERCARD);
            if (!$cart_deleted) {
                throw new Exception('could not remove ordered cart items');
            }
            if (!$db->commit()) {
                throw new Exception('order commit failed');
            }
        } catch (Exception $exception) {
            $db->rollback();
            throw $exception;
        }

        foreach ($post_commit as $event) {
            Wo_CreateUserChat($event['seller_id'], $buyer_id);
            VNSEEA_PublishRealtimeMessageChange($event['message_id']);
            Wo_PublishRealtimeNotification(
                $event['seller_id'],
                $event['notification_id'],
                'notification'
            );
        }

        return array(
            'orders' => $response_orders,
            'removed_product_ids' => array_map('strval', array_keys($removed_product_ids)),
            'cart_count' => (int)$db->where('user_id', $buyer_id)->getValue(T_USERCARD, 'COALESCE(SUM(units), 0)'),
        );
    }
}

if (!function_exists('VNSEEA_ChangeMarketRequestOrderStatus')) {
    function VNSEEA_ChangeMarketRequestOrderStatus($hash_id, $status)
    {
        global $wo, $db;

        $actor_id = (int)$wo['user']['user_id'];
        $db->startTransaction();
        try {
            $orders = $db->rawQuery(
                'SELECT * FROM ' . T_USER_ORDERS . ' WHERE `hash_id` = ? FOR UPDATE',
                array($hash_id)
            );
            if (empty($orders)) {
                throw new Exception('order not found');
            }

            $order = $orders[0];
            $current_status = (string)$order->status;
            $seller_id = (int)$order->product_owner_id;
            $buyer_id = (int)$order->user_id;
            foreach ($orders as $row) {
                if (
                    (string)$row->order_flow !== 'request' ||
                    (string)$row->status !== $current_status ||
                    (int)$row->product_owner_id !== $seller_id ||
                    (int)$row->user_id !== $buyer_id
                ) {
                    throw new Exception('order state is inconsistent');
                }
            }

            $allowed = array();
            if ($actor_id === $seller_id) {
                if ($current_status === 'placed') {
                    $allowed = array('canceled', 'accepted');
                } elseif ($current_status === 'accepted') {
                    $allowed = array('packed', 'shipped');
                } elseif ($current_status === 'packed') {
                    $allowed = array('shipped');
                } elseif ($current_status === 'shipped') {
                    $allowed = array('delivered');
                }
            } elseif ($actor_id === $buyer_id) {
                if ($current_status === 'placed') {
                    $allowed = array('canceled');
                } elseif ($current_status === 'shipped') {
                    $allowed = array('delivered');
                }
            }
            if (!in_array($status, $allowed, true)) {
                throw new Exception('order has already been processed');
            }

            $update = array('status' => $status);
            if ($current_status === 'placed') {
                foreach ($orders as $row) {
                    if (!empty($row->stock_reserved)) {
                        throw new Exception('stock has already been reserved');
                    }
                }
            }

            if ($status === 'accepted') {
                $required_by_product = array();
                foreach ($orders as $row) {
                    $product_id = (int)$row->product_id;
                    if (!isset($required_by_product[$product_id])) {
                        $required_by_product[$product_id] = 0;
                    }
                    $required_by_product[$product_id] += max(1, (int)$row->units);
                }
                $product_ids = array_keys($required_by_product);
                sort($product_ids, SORT_NUMERIC);
                $products = $db->rawQuery(
                    'SELECT `id`, `units`, `active`, `status` FROM ' . T_PRODUCTS .
                    ' WHERE `id` IN (' . implode(',', $product_ids) . ') ORDER BY `id` ASC FOR UPDATE'
                );
                $products_by_id = array();
                foreach ($products as $product) {
                    $products_by_id[(int)$product->id] = $product;
                }
                foreach ($required_by_product as $product_id => $quantity) {
                    $product = isset($products_by_id[$product_id]) ? $products_by_id[$product_id] : null;
                    if (
                        empty($product) ||
                        (int)$product->active !== 1 ||
                        (int)$product->status !== 0 ||
                        (int)$product->units < $quantity
                    ) {
                        throw new Exception('not enough stock for product ' . $product_id);
                    }
                    if (!$db->where('id', $product_id)->update(
                        T_PRODUCTS,
                        array('units' => $db->dec($quantity))
                    )) {
                        throw new Exception('could not reserve stock');
                    }
                }
                $update['stock_reserved'] = 1;
            } elseif ($current_status !== 'placed') {
                foreach ($orders as $row) {
                    if (empty($row->stock_reserved)) {
                        throw new Exception('stock has not been reserved');
                    }
                }
            }

            $updated = $db->where('hash_id', $hash_id)
                ->where('status', $current_status)
                ->update(T_USER_ORDERS, $update);
            if (!$updated || !$db->commit()) {
                throw new Exception('could not update order status');
            }

            $order->status = $status;
            if ($status === 'accepted') {
                $order->stock_reserved = 1;
            }
            return $order;
        } catch (Exception $exception) {
            $db->rollback();
            throw $exception;
        }
    }
}

if ($_POST['type'] == 'ensure_cart') {
    try {
        if (empty($_POST['product_id']) || !is_numeric($_POST['product_id'])) {
            throw new Exception('product_id can not be empty');
        }
        $product_id = (int)$_POST['product_id'];
        $product = Wo_GetProduct($product_id);
        if (empty($product) || empty($product['active']) || (int)$product['status'] !== 0 || (int)$product['units'] < 1) {
            throw new Exception('product not found');
        }
        if ((int)$product['user_id'] === (int)$wo['user']['user_id']) {
            throw new Exception('you can not add your own product');
        }

        $cart_item = $db->where('user_id', $wo['user']['user_id'])
            ->where('product_id', $product_id)
            ->getOne(T_USERCARD);
        if (empty($cart_item)) {
            $cart_id = $db->insert(T_USERCARD, array(
                'user_id' => $wo['user']['user_id'],
                'units' => 1,
                'product_id' => $product_id,
            ));
            if (empty($cart_id)) {
                throw new Exception('could not add product to cart');
            }
        }
        $response_data = array(
            'api_status' => 200,
            'type' => empty($cart_item) ? 'added' : 'existing',
            'count' => (int)$db->where('user_id', $wo['user']['user_id'])->getValue(T_USERCARD, 'COALESCE(SUM(units), 0)'),
        );
    } catch (Exception $e) {
        $error_code = 5;
        $error_message = $e->getMessage();
    }
}
elseif ($_POST['type'] == 'add_cart') {

	try {

		marketAddCartValidation();

		$qty = 1;
        if (!empty($_POST['qty']) && is_numeric($_POST['qty']) && $_POST['qty'] > 0) {
            $qty = Wo_Secure($_POST['qty']);
        }
        $db->insert(T_USERCARD,array('user_id' => $wo['user']['user_id'],
                                 'units' => $qty,
                                 'product_id' => Wo_Secure($_POST['product_id'])));
        $response_data = array(
	        'api_status' => 200,
	        'type' => 'added',
	        'count' => $db->where('user_id',$wo['user']['user_id'])->getValue(T_USERCARD,'COUNT(*)')
	    );
		
	} catch (Exception $e) {
		$error_code    = 5;
	    $error_message = $e->getMessage();
	}
}
elseif ($_POST['type'] == 'related_products') {
	try {
		
		$data['limit'] = (!empty($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 && $_POST['limit'] <= 50 ? Wo_Secure($_POST['limit']) : 10);
        $products = Wo_GetProducts($data);

        $response_data = array(
	        'api_status' => 200,
	        'data' => $products
	    );

	} catch (Exception $e) {
		$error_code    = 5;
	    $error_message = $e->getMessage();
	}
}
elseif ($_POST['type'] == 'change_qty') {
    try {
        
        marketChangeQtyValidation();

        $qty = Wo_Secure($_POST['qty']);
        $db->where('product_id',$wo['product']['id'])->where('user_id',$wo['user']['user_id'])->update(T_USERCARD,array('units' => $qty));

        $response_data = array(
            'api_status' => 200,
            'message' => 'qty changed successfully'
        );

    } catch (Exception $e) {
        $error_code    = 5;
        $error_message = $e->getMessage();
    }
}
elseif ($_POST['type'] == 'remove_cart') {

	try {

		marketRemoveCartValidation();
		
		$db->where('product_id',Wo_Secure($_POST['product_id']))->where('user_id',$wo['user']['user_id'])->delete(T_USERCARD);
		$response_data = array(
	        'api_status' => 200,
	        'count' => $db->where('user_id',$wo['user']['user_id'])->getValue(T_USERCARD,'COUNT(*)')
	    );

	} catch (Exception $e) {
		$error_code    = 5;
	    $error_message = $e->getMessage();
	}
}
elseif ($_POST['type'] == 'request_order') {
    try {
        $request_result = VNSEEA_MarketRequestOrder();
        $response_data = array(
            'api_status' => 200,
            'message' => 'purchase request sent successfully',
            'data' => $request_result,
        );
    } catch (Exception $e) {
        $error_code = 5;
        $error_message = $e->getMessage();
    }
}
elseif ($_POST['type'] == 'buy') {

	try {
		
		marketBuyValidation();

		foreach ($wo['insert'] as $key => $value) {
            $hash_id = uniqid(rand(11111,999999));
            $total = 0;
            $total_commission = 0;
            $total_final_price = 0;
            foreach ($value as $key2 => $value2) {
                $db->where('id',$value2['product_id'])->update(T_PRODUCTS,array('units' => $db->dec($value2['units'])));
                $store_commission = 0;
                if (!empty($wo['config']['store_commission'])) {
                    $store_commission = round((($wo['config']['store_commission'] * ($value2['price'] * $value2['units'])) / 100), 2);
                }
                $total += ($value2['price'] * $value2['units']);
                $total_commission += $store_commission;
                $total_final_price += ($value2['price'] * $value2['units']) - $store_commission;
                    
                $db->insert(T_USER_ORDERS,array('user_id' => $wo['user']['user_id'],
                                           'product_owner_id' => $key,
                                           'product_id' => $value2['product_id'],
                                           'price' => ($value2['price'] * $value2['units']),
                                           'commission' => $store_commission,
                                           'final_price' => ($value2['price'] * $value2['units']) - $store_commission,
                                           'hash_id' => $hash_id,
                                           'units' => $value2['units'],
                                           'status' => 'placed',
                                           'address_id' => $wo['address']->id,
                                           'time' => time()));
            }
            $db->where('user_id',$wo['user']['user_id'])->update(T_USERS,array('wallet' => $db->dec($total)));

            cache($wo['user']['user_id'], 'users', 'delete');
            //$db->where('user_id',$key)->update(T_USERS,array('balance' => $db->inc($total_final_price)));
            $notes = $wo['lang']['product_purchase'];
            $notes_2 = $wo['lang']['product_sale'];
            mysqli_query($sqlConnect, "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`) VALUES ({$wo['user']['user_id']}, 'PURCHASE', {$total}, '{$notes}')");
            mysqli_query($sqlConnect, "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`) VALUES ({$key}, 'SALE', {$total_final_price}, '{$notes_2}')");
            $db->insert(T_PURCHAES,array('user_id' => $wo['user']['user_id'],
                                             'order_hash_id' => $hash_id,
                                             'price' => $total,
                                             'data' => json_encode(array('name' => !empty($wo['main_product']) && !empty($wo['main_product']['name']) ? $wo['main_product']['name'] : '')),
                                             'commission' => $total_commission,
                                             'final_price' => $total_final_price,
                                             'time' => time()));
            $notification_data_array = array(
                'notifier_id' => $wo['user']['user_id'],
                'recipient_id' => $key,
                'type' => 'new_orders',
                'url' => 'index.php?link1=orders',
                'time' => time()
            );
            $notification_id = $db->insert(T_NOTIFICATION,$notification_data_array);
            if (!empty($notification_id)) {
                Wo_PublishRealtimeNotification($key, $notification_id, 'notification');
            }
            VNSEEA_SendMarketOrderMessage($key, $hash_id, $value, $total, $wo['address']);
        }

        $db->where('user_id',$wo['user']['user_id'])->delete(T_USERCARD);

        $response_data = array(
	        'api_status' => 200,
	        'message' => 'order placed successfully'
	    );

	} catch (Exception $e) {
		$error_code    = 5;
	    $error_message = $e->getMessage();
	}
}
elseif ($_POST['type'] == 'checkout') {
	$wo['items'] = $db->where('user_id', $wo['user']['id'])->get(T_USERCARD);
	$wo['total'] = 0;
	$data = [];
	$checkout_currency_rule = Wo_GetCurrencyRule($wo['config']['currency']);
	if (!empty($wo['items'])) {
	    foreach ($wo['items'] as $key => $wo['item']) {
	        $wo['product'] = Wo_GetProduct($wo['item']->product_id);
	        $stock_units = (int) $wo['product']['units'];
	        $product_currency_rule = Wo_GetCurrencyRule($wo['product']['currency']);
	        $wo['product']['currency_code'] = $product_currency_rule['code'];
	        $wo['product']['currency_symbol'] = $product_currency_rule['symbol'];
	        $wo['product']['currency_rule'] = array(
	            'decimals' => $product_currency_rule['decimals'],
	            'decimal_sep' => $product_currency_rule['decimal_sep'],
	            'thousand_sep' => $product_currency_rule['thousand_sep']
	        );
	        $checkout_unit_price = $wo['product']['price'];
	        if (!empty($wo['currencies']) && !empty($wo['currencies'][$wo['product']['currency']]) && $wo['currencies'][$wo['product']['currency']]['text'] != $wo['config']['currency'] && !empty($wo['config']['exchange']) && !empty($wo['config']['exchange'][$wo['currencies'][$wo['product']['currency']]['text']])) {
	            $checkout_unit_price = ($wo['product']['price'] / $wo['config']['exchange'][$wo['currencies'][$wo['product']['currency']]['text']]);
	        }
	        $wo['total'] += ($checkout_unit_price * $wo['item']->units);
	        $wo['product']['checkout_price'] = $checkout_unit_price;
	        $wo['product']['stock_units'] = $stock_units;
	        $wo['product']['units'] = $wo['item']->units;
	        $data[] = $wo['product'];
	    }
	}
	$response_data = array(
        'api_status' => 200,
        'data' => $data,
	    'total' => $wo['total'],
	    'currency_code' => $checkout_currency_rule['code'],
	    'currency_symbol' => $checkout_currency_rule['symbol'],
	    'currency_rule' => array(
	        'decimals' => $checkout_currency_rule['decimals'],
	        'decimal_sep' => $checkout_currency_rule['decimal_sep'],
	        'thousand_sep' => $checkout_currency_rule['thousand_sep']
	    )
    );
}
elseif ($_POST['type'] == 'purchased') {

	$offset = (!empty($_POST['offset']) && is_numeric($_POST['offset']) && $_POST['offset'] > 0 ? Wo_Secure($_POST['offset']) : 0);
    $limit = (!empty($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 && $_POST['limit'] <= 50 ? Wo_Secure($_POST['limit']) : 20);

    if (!empty($offset)) {
    	$db->where('id', $offset,'<');
    }

    $wo['purchased'] = $db->where('user_id', $wo['user']['user_id'])->orderBy('id', 'DESC')->get(T_PURCHAES, $limit);

    $purchased = array_map(function ($purchase) use ($wo,$db)
    {
    	$purchase->data = json_decode($purchase->data, true);
        $purchase->type = $wo['lang']['order'];
        $purchase->date = Wo_Time_Elapsed_String($purchase->time);
        $purchase->url  = Wo_SeoLink('index.php?link1=customer_order&id=' . $purchase->order_hash_id);
        $purchase->orders = [];
        $orders = $db->where('hash_id',$purchase->order_hash_id)->get(T_USER_ORDERS);
        foreach ($orders as $key => $order) {
            $order->product = Wo_GetProduct($order->product_id);
            if (!empty($order->product) && !empty($order->product['user_data'])) {
                $order->product['user_data'] = Wo_SecureData([],$order->product['user_data']);
            }
            if (!empty($order->address_id)) {
                $order->address = $db->where('id', $order->address_id)->getOne(T_USER_ADDRESS);
            }
            $purchase->orders[] = $order;
        }
        return $purchase;
    }, $wo['purchased']);

    $response_data = array(
        'api_status' => 200,
        'data' => $purchased
    );
}
elseif ($_POST['type'] == 'orders') {
    $offset = (!empty($_POST['offset']) && is_numeric($_POST['offset']) && $_POST['offset'] > 0 ? Wo_Secure($_POST['offset']) : 0);
    $limit = (!empty($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 && $_POST['limit'] <= 50 ? Wo_Secure($_POST['limit']) : 20);

    if (!empty($offset)) {
        $db->where('id', $offset, '<');
    }

    $orders_list = $db->where('product_owner_id', $wo['user']['user_id'])
                      ->orderBy('id', 'DESC')
                      ->groupBy('hash_id')
                      ->get(T_USER_ORDERS, $limit);

    $purchased = [];
    if (!empty($orders_list)) {
        foreach ($orders_list as $order_row) {
            $hash_id = $order_row->hash_id;
            $sub_orders = $db->where('hash_id', $hash_id)->get(T_USER_ORDERS);
            
            $price_total = 0;
            $final_price_total = 0;
            $normalized_sub_orders = [];
            
            foreach ($sub_orders as $sub_order) {
                $sub_order->product = Wo_GetProduct($sub_order->product_id);
                if (!empty($sub_order->product) && !empty($sub_order->product['user_data'])) {
                    $sub_order->product['user_data'] = Wo_SecureData([], $sub_order->product['user_data']);
                }
                
                $buyer_data = Wo_UserData($sub_order->user_id);
                if (!empty($buyer_data)) {
                    $sub_order->buyer = Wo_SecureData([], $buyer_data);
                }
                
                $normalized_sub_orders[] = $sub_order;
                $price_total += $sub_order->price;
                $final_price_total += $sub_order->final_price;
            }

            $address = $db->where('id', $order_row->address_id)->getOne(T_USER_ADDRESS);

            $purchased[] = [
                'id' => $order_row->id,
                'order_hash_id' => $hash_id,
                'price' => $price_total,
                'final_price' => $final_price_total,
                'time' => $order_row->time,
                'date' => date('c', $order_row->time),
                'orders' => $normalized_sub_orders,
                'address' => $address
            ];
        }
    }

    $response_data = array(
        'api_status' => 200,
        'data' => $purchased
    );
}
elseif ($_POST['type'] == 'tracking') {
	try {
		marketTrackingValidation();

		$db->where('hash_id',$wo['hash_id'])->update(T_USER_ORDERS,array('tracking_url' => $wo['tracking_url'],
                                                                         'tracking_id' => $wo['tracking_id']));
        $notification_data_array = array(
            'notifier_id' => $wo['user']['user_id'],
            'recipient_id' => $wo['order']->user_id,
            'type' => 'added_tracking',
            'url' => 'index.php?link1=customer_order&id='.$wo['hash_id'],
            'time' => time()
        );
        $notification_id = $db->insert(T_NOTIFICATION,$notification_data_array);
        if (!empty($notification_id)) {
            Wo_PublishRealtimeNotification($wo['order']->user_id, $notification_id, 'notification');
        }
        $response_data = array(
	        'api_status' => 200,
	        'data' => 'tracking info has been saved successfully'
	    );
		
	} catch (Exception $e) {
		$error_code    = 5;
	    $error_message = $e->getMessage();
	}
}
elseif ($_POST['type'] == 'refund') {
	try {
		marketRefundValidation();

		$db->insert(T_REFUND,array('order_hash_id' => $wo['hash_id'],
                                  'user_id' => $wo['user']['user_id'],
                                  'description' => $wo['message'],
                                  'time' => time()));
        $notif_data = array(
            'recipient_id' => 0,
            'type' => 'refund',
            'admin' => 1,
            'time' => time()
        );
        $db->insert(T_NOTIFICATION,$notif_data);

        $response_data = array(
	        'api_status' => 200,
	        'data' => 'your request is under review'
	    );
		
	} catch (Exception $e) {
		$error_code    = 5;
	    $error_message = $e->getMessage();
	}
}
elseif ($_POST['type'] == 'change_status') {
	try {
		marketChangeStatusValidation();

			$status = Wo_Secure($_POST['status']);
			$hash_id = $wo['hash_id'];
			$order_flow = !empty($wo['order']->order_flow) ? (string)$wo['order']->order_flow : 'prepaid';

			$types = array();
        if ($wo['order']->product_owner_id == $wo['user']['user_id']) {
            if ($wo['order']->status == 'placed') {
	            $types = $order_flow === 'request'
	                ? array('canceled', 'accepted')
	                : array('canceled','accepted','packed','shipped');
            }
            if ($wo['order']->status == 'accepted') {
                $types = array('packed','shipped');
            }
            if ($wo['order']->status == 'packed') {
                $types = array('shipped');
            }
            if ($wo['order']->status == 'shipped') {
                $types = array('delivered');
            }
        }
        elseif ($wo['order']->user_id == $wo['user']['user_id']) {
	        if ($order_flow === 'request' && $wo['order']->status == 'placed') {
	            $types = array('canceled');
	        }
            if ($wo['order']->status == 'shipped') {
                $types = array('delivered');
            }
        }
        if (in_array($status, $types)) {
	        if ($order_flow === 'request') {
	            $wo['order'] = VNSEEA_ChangeMarketRequestOrderStatus($hash_id, $status);
	        } else {
	            $updated_order = $db->where('hash_id', $hash_id)->update(
	                T_USER_ORDERS,
	                array('status' => $status)
	            );
	            if (!$updated_order) {
	                throw new Exception('could not update order status');
	            }
	        }

	        if ($status == 'delivered' && $order_flow !== 'request') {
                $total = $db->where('hash_id',$hash_id)->getValue(T_USER_ORDERS,'SUM(final_price)');
                $db->where('user_id',$wo['order']->product_owner_id)->update(T_USERS,array('balance' => $db->inc($total)));

                cache($wo['order']->product_owner_id, 'users', 'delete');

                $notification_data_array = array(
                    'notifier_id' => $wo['user']['user_id'],
                    'recipient_id' => $wo['order']->product_owner_id,
                    'type' => 'status_changed',
                    'url' => 'index.php?link1=order&id='.$hash_id,
                    'time' => time()
                );
                $notification_id = $db->insert(T_NOTIFICATION,$notification_data_array);
                if (!empty($notification_id)) {
                    Wo_PublishRealtimeNotification($wo['order']->product_owner_id, $notification_id, 'notification');
                }
            }
	        else{
	            $status_recipient_id = (int)$wo['order']->user_id;
	            $status_url = 'index.php?link1=customer_order&id=' . $hash_id;
	            if ((int)$wo['user']['user_id'] === (int)$wo['order']->user_id) {
	                $status_recipient_id = (int)$wo['order']->product_owner_id;
	                $status_url = 'index.php?link1=orders&id=' . $hash_id;
	            }
                $notification_data_array = array(
                    'notifier_id' => $wo['user']['user_id'],
	                'recipient_id' => $status_recipient_id,
                    'type' => 'status_changed',
	                'url' => $status_url,
                    'time' => time()
                );
                $notification_id = $db->insert(T_NOTIFICATION,$notification_data_array);
                if (!empty($notification_id)) {
	                Wo_PublishRealtimeNotification($status_recipient_id, $notification_id, 'notification');
                }
            }

            $response_data = array(
		        'api_status' => 200,
		        'data' => 'order status changed successfully'
		    );
        }
        else{
        	throw new Exception("order status not found");
        }

	} catch (Exception $e) {
		$error_code    = 5;
	    $error_message = $e->getMessage();
	}
}
elseif ($_POST['type'] == 'review') {
	try {

		marketReviewValidation();

		$product_id = Wo_Secure($_POST['product_id']);
        $rating = Wo_Secure($_POST['rating']);
        $review = Wo_Secure($_POST['review'],1);
        $files = array();
        if (!empty($_FILES['images'])) {
            foreach ($_FILES['images']['name'] as $key => $value) {
                $file_info = array(
                    'file' => $_FILES['images']['tmp_name'][$key],
                    'size' => $_FILES['images']['size'][$key],
                    'name' => $_FILES['images']['name'][$key],
                    'type' => $_FILES['images']['type'][$key]
                );
                $file_upload = Wo_ShareFile($file_info);
                if (!empty($file_upload) && !empty($file_upload['filename'])) {
                    $files[] = $file_upload['filename'];
                }
            }
        }
        $id = $db->insert(T_PRODUCT_REVIEW,array('user_id' => $wo['user']['user_id'],
                                       'product_id' => $product_id,
                                       'review' => $review,
                                       'time' => time(),
                                       'star' => $rating));
        if (!empty($id)) {
            if (!empty($files)) {
                foreach ($files as $key => $value) {
                    $db->insert(T_ALBUMS_MEDIA,array('review_id' => $id,
                                                     'image' => $value));
                }
            }
            $product = Wo_GetProduct($product_id);
            $notification_data_array = array(
                'notifier_id' => $wo['user']['user_id'],
                'recipient_id' => $product['user_id'],
                'type' => 'new_review',
                'url' => 'index.php?link1=post&id='.$product['seo_id'],
                'time' => time()
            );
            $notification_id = $db->insert(T_NOTIFICATION,$notification_data_array);
            if (!empty($notification_id)) {
                Wo_PublishRealtimeNotification($product['user_id'], $notification_id, 'notification');
            }

            $response_data = array(
		        'api_status' => 200,
		        'data' => 'review has been sent successfully'
		    );
		    
        }
        else{
            throw new Exception("something went wrong");
        }

	} catch (Exception $e) {
		$error_code    = 5;
	    $error_message = $e->getMessage();
	}
}
