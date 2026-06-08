<?php
// English description: Exposes read-only public entities for Nuxt guest pages without opening private API actions.

$response_data = array(
    'api_status' => 400
);

function Wo_PublicContent_Read($key, $fallback = '')
{
    if (isset($_POST[$key])) {
        return $_POST[$key];
    }
    if (isset($_GET[$key])) {
        return $_GET[$key];
    }
    return $fallback;
}

function Wo_PublicContent_Limit($fallback = 20, $max = 50)
{
    $limit = Wo_PublicContent_Read('limit', $fallback);
    if (!is_numeric($limit)) {
        return $fallback;
    }
    return max(1, min($max, (int) $limit));
}

function Wo_PublicContent_Offset()
{
    $offset = Wo_PublicContent_Read('offset', Wo_PublicContent_Read('after_id', 0));
    if (!is_numeric($offset)) {
        return 0;
    }
    return max(0, (int) $offset);
}

function Wo_PublicContent_User()
{
    global $wo;

    if (!isset($wo['user']) || !is_array($wo['user'])) {
        $wo['user'] = array(
            'id' => 0,
            'user_id' => 0,
            'language' => isset($wo['config']['language']) ? $wo['config']['language'] : 'english',
            'lat' => 0,
            'lng' => 0
        );
    }
}

function Wo_PublicContent_StripPrivate($entity)
{
    global $non_allowed;

    if (!is_array($entity)) {
        return $entity;
    }

    $blocked = array(
        'password',
        'access_token',
        'email_code',
        'sms_code',
        'two_factor_verified',
        'two_factor_secret',
        'wallet',
        'balance',
        'paypal_email',
        'stripe_session_id',
        'phone_number',
        'email'
    );

    if (!empty($non_allowed) && is_array($non_allowed)) {
        $blocked = array_unique(array_merge($blocked, $non_allowed));
    }

    foreach ($blocked as $key) {
        if (isset($entity[$key])) {
            unset($entity[$key]);
        }
    }

    foreach ($entity as $key => $value) {
        if (is_array($value)) {
            $entity[$key] = Wo_PublicContent_StripPrivate($value);
        }
    }

    return $entity;
}

function Wo_PublicContent_Response($data)
{
    return array_merge(array('api_status' => 200), $data);
}

function Wo_PublicContent_NotFound($message)
{
    global $error_code, $error_message;
    $error_code = 404;
    $error_message = $message;
}

function Wo_PublicContent_PageByName($page_name)
{
    global $db;

    $page_name = Wo_Secure($page_name);
    if (empty($page_name)) {
        return array();
    }

    $page = $db->where('page_name', $page_name)->where('active', '1')->getOne(T_PAGES);
    if (empty($page)) {
        return array();
    }

    return Wo_PublicContent_StripPrivate(Wo_PageData($page->page_id));
}

function Wo_PublicContent_PageById($page_id)
{
    global $db;

    if (empty($page_id) || !is_numeric($page_id) || $page_id < 1) {
        return array();
    }

    $page = $db->where('page_id', Wo_Secure($page_id))->where('active', '1')->getOne(T_PAGES);
    if (empty($page)) {
        return array();
    }

    return Wo_PublicContent_StripPrivate(Wo_PageData($page->page_id));
}

function Wo_PublicContent_GroupByName($group_name)
{
    global $db;

    $group_name = Wo_Secure($group_name);
    if (empty($group_name)) {
        return array();
    }

    $group = $db->where('group_name', $group_name)->where('active', '1')->getOne(T_GROUPS);
    if (empty($group) || (int) $group->privacy !== 1) {
        return array();
    }

    return Wo_PublicContent_StripPrivate(Wo_GroupData($group->id));
}

function Wo_PublicContent_GroupById($group_id)
{
    global $db;

    if (empty($group_id) || !is_numeric($group_id) || $group_id < 1) {
        return array();
    }

    $group = $db->where('id', Wo_Secure($group_id))->where('active', '1')->getOne(T_GROUPS);
    if (empty($group) || (int) $group->privacy !== 1) {
        return array();
    }

    return Wo_PublicContent_StripPrivate(Wo_GroupData($group->id));
}

function Wo_PublicContent_ProfileByUsername($username)
{
    global $db;

    $username = Wo_Secure($username);
    if (empty($username)) {
        return array();
    }

    $user = $db->where('username', $username)->where('active', '1')->getOne(T_USERS);
    if (empty($user)) {
        return array();
    }

    $profile = Wo_UserData($user->user_id, false);
    return Wo_PublicContent_StripPrivate($profile);
}

function Wo_PublicContent_PostAllowed($post)
{
    global $db;

    if (empty($post)) {
        return false;
    }

    if (isset($post->active) && (int) $post->active !== 1) {
        return false;
    }

    if ((string) $post->postPrivacy !== '0') {
        return false;
    }

    if (!empty($post->page_id)) {
        $page = $db->where('page_id', $post->page_id)->where('active', '1')->getOne(T_PAGES);
        if (empty($page)) {
            return false;
        }
    }

    if (!empty($post->group_id)) {
        $group = $db->where('id', $post->group_id)->where('active', '1')->getOne(T_GROUPS);
        if (empty($group) || (int) $group->privacy !== 1) {
            return false;
        }
    }

    return true;
}

function Wo_PublicContent_PostById($post_id)
{
    global $db;

    if (empty($post_id) || !is_numeric($post_id) || $post_id < 1) {
        return array();
    }

    $post_id = Wo_Secure($post_id);
    $post = $db->where('id', $post_id)->getOne(T_POSTS);
    if (!Wo_PublicContent_PostAllowed($post)) {
        return array();
    }

    return Wo_PublicContent_StripPrivate(Wo_PostData($post_id, '', 'not_limited'));
}

function Wo_PublicContent_Posts($where_key, $where_value)
{
    global $db;

    $limit = Wo_PublicContent_Limit(10, 50);
    $after_id = Wo_PublicContent_Read('after_post_id', Wo_PublicContent_Read('after_id', 0));

    $db->where($where_key, Wo_Secure($where_value));
    $db->where('active', '1');
    $db->where('postPrivacy', '0');
    if (!empty($after_id) && is_numeric($after_id)) {
        $db->where('id', Wo_Secure($after_id), '<');
    }
    $ids = $db->orderBy('id', 'DESC')->get(T_POSTS, $limit, array('id'));
    $posts = array();

    foreach ($ids as $row) {
        $post = Wo_PublicContent_PostById($row->id);
        if (!empty($post)) {
            $posts[] = $post;
        }
    }

    return $posts;
}

function Wo_PublicContent_UserPosts()
{
    $username = Wo_PublicContent_Read('username', '');
    $user_id = Wo_PublicContent_Read('user_id', 0);

    if (!empty($username)) {
        $profile = Wo_PublicContent_ProfileByUsername($username);
        if (empty($profile)) {
            return array();
        }

        $user_id = isset($profile['user_id']) ? $profile['user_id'] : (isset($profile['id']) ? $profile['id'] : 0);
    }

    if (empty($user_id) || !is_numeric($user_id) || $user_id < 1) {
        return array();
    }

    return Wo_PublicContent_Posts('user_id', $user_id);
}

function Wo_PublicContent_ProductById($id)
{
    if (empty($id)) {
        return array();
    }

    $numeric_id = Wo_PublicContent_NumericId($id);

    if ($numeric_id < 1) {
        return array();
    }

    $product = Wo_PublicContent_ProductByPostId($numeric_id);
    if (!empty($product)) {
        return $product;
    }

    return Wo_PublicContent_ProductByProductId($numeric_id);
}

function Wo_PublicContent_ProductPublicData($product)
{
    if (empty($product) || !is_array($product)) {
        return array();
    }

    $source = $product;
    $product = Wo_PublicContent_StripPrivate($product);
    $product_id = isset($source['product_id']) ? $source['product_id'] : (isset($source['id']) ? $source['id'] : 0);

    if (!empty($product_id)) {
        $product['id'] = $product_id;
        $product['product_id'] = $product_id;
    }

    if (!empty($source['post_id'])) {
        $product['post_id'] = $source['post_id'];
    }

    return $product;
}

function Wo_PublicContent_NumericId($id)
{
    $numeric_id = 0;
    if (is_numeric($id)) {
        $numeric_id = (int) $id;
    } else if (preg_match('/^([0-9]+)/', (string) $id, $matches)) {
        $numeric_id = (int) $matches[1];
    }

    return $numeric_id;
}

function Wo_PublicContent_ProductByProductId($product_id)
{
    global $db;

    $numeric_id = Wo_PublicContent_NumericId($product_id);
    if ($numeric_id < 1) {
        return array();
    }

    $product = $db->where('id', $numeric_id)->where('active', '1')->where('status', '1', '!=')->getOne(T_PRODUCTS);
    if (empty($product)) {
        return array();
    }

    return Wo_PublicContent_ProductPublicData(Wo_GetProduct($product->id));
}

function Wo_PublicContent_ProductByPostId($post_id)
{
    global $db;

    $numeric_id = Wo_PublicContent_NumericId($post_id);
    if ($numeric_id < 1) {
        return array();
    }

    $post = $db->where('id', $numeric_id)->getOne(T_POSTS);
    if (empty($post) || empty($post->product_id) || !Wo_PublicContent_PostAllowed($post)) {
        return array();
    }

    return Wo_PublicContent_ProductByProductId($post->product_id);
}

function Wo_PublicContent_Products()
{
    $filter = array(
        'limit' => Wo_PublicContent_Limit(35, 50),
        'after_id' => Wo_PublicContent_Offset(),
        'keyword' => Wo_Secure(Wo_PublicContent_Read('keyword', Wo_PublicContent_Read('q', ''))),
        'c_id' => Wo_PublicContent_Read('category_id', 0),
        'sub_id' => Wo_PublicContent_Read('sub_id', 0),
        'order_by' => Wo_PublicContent_Read('order_by', '')
    );

    if (empty($filter['after_id'])) {
        unset($filter['after_id']);
    }
    if (empty($filter['keyword'])) {
        unset($filter['keyword']);
    }
    if (empty($filter['c_id']) || !is_numeric($filter['c_id'])) {
        unset($filter['c_id']);
    }
    if (empty($filter['sub_id']) || !is_numeric($filter['sub_id'])) {
        unset($filter['sub_id']);
    }
    if (!in_array($filter['order_by'], array('price_low', 'price_high'))) {
        unset($filter['order_by']);
    }

    return array_map('Wo_PublicContent_ProductPublicData', Wo_GetProducts($filter));
}

function Wo_PublicContent_BlogById($blog_id)
{
    if (empty($blog_id) || !is_numeric($blog_id) || $blog_id < 1) {
        return array();
    }

    $blog = Wo_GetArticle($blog_id);
    if (empty($blog)) {
        return array();
    }

    return Wo_PublicContent_BlogPublicData($blog);
}

function Wo_PublicContent_BlogPublicData($blog)
{
    if (empty($blog) || !is_array($blog)) {
        return array();
    }

    $source = $blog;
    $blog = Wo_PublicContent_StripPrivate($blog);
    $blog_id = isset($source['blog_id']) ? $source['blog_id'] : (isset($source['id']) ? $source['id'] : 0);

    if (!empty($blog_id)) {
        $blog['id'] = $blog_id;
        $blog['blog_id'] = $blog_id;
        $blog['article_id'] = $blog_id;
    }

    return $blog;
}

function Wo_PublicContent_Blogs()
{
    $articles = Wo_GetBlogs(array(
        'limit' => Wo_PublicContent_Limit(25, 50),
        'offset' => Wo_PublicContent_Offset(),
        'category' => Wo_PublicContent_Read('category', false),
        'user_id' => 0
    ));

    return array_map('Wo_PublicContent_BlogPublicData', $articles);
}

function Wo_PublicContent_Offers()
{
    global $db;

    $filter = array(
        'limit' => Wo_PublicContent_Limit(10, 50),
        'after_id' => Wo_PublicContent_Offset()
    );
    $page_id = Wo_PublicContent_Read('page_id', 0);

    if (!empty($page_id) && is_numeric($page_id) && $page_id > 0) {
        $page = Wo_PublicContent_PageById($page_id);
        if (empty($page)) {
            return array();
        }
        $filter['page_id'] = $page_id;
    }

    $offers = Wo_GetAllOffers($filter);
    $public_offers = array();

    foreach ($offers as $offer) {
        if (empty($offer) || !is_array($offer)) {
            continue;
        }

        $post_id = isset($offer['post_id']) ? $offer['post_id'] : 0;
        $post = !empty($post_id) ? $db->where('id', Wo_Secure($post_id))->getOne(T_POSTS) : null;

        if (empty($post) || !Wo_PublicContent_PostAllowed($post)) {
            continue;
        }

        $page_id = isset($offer['page_id']) ? $offer['page_id'] : 0;
        if (!empty($page_id) && empty(Wo_PublicContent_PageById($page_id))) {
            continue;
        }

        $public_offers[] = Wo_PublicContent_StripPrivate($offer);
    }

    return $public_offers;
}

Wo_PublicContent_User();

$action = Wo_Secure(Wo_PublicContent_Read('action', Wo_PublicContent_Read('type', '')));

if ($action == 'page') {
    $page = Wo_PublicContent_PageByName(Wo_PublicContent_Read('page_name', ''));
    if (empty($page)) {
        Wo_PublicContent_NotFound('Page not found.');
    } else {
        $response_data = Wo_PublicContent_Response(array('page_data' => $page));
    }
} else if ($action == 'group') {
    $group = Wo_PublicContent_GroupByName(Wo_PublicContent_Read('group_name', ''));
    if (empty($group)) {
        Wo_PublicContent_NotFound('Group not found.');
    } else {
        $response_data = Wo_PublicContent_Response(array('group_data' => $group));
    }
} else if ($action == 'profile') {
    $profile = Wo_PublicContent_ProfileByUsername(Wo_PublicContent_Read('username', ''));
    if (empty($profile)) {
        Wo_PublicContent_NotFound('Profile not found.');
    } else {
        $response_data = Wo_PublicContent_Response(array('user_data' => $profile));
    }
} else if ($action == 'post') {
    $post = Wo_PublicContent_PostById(Wo_PublicContent_Read('post_id', 0));
    if (empty($post)) {
        Wo_PublicContent_NotFound('Post not found.');
    } else {
        $response_data = Wo_PublicContent_Response(array('post_data' => $post, 'post_comments' => array()));
    }
} else if ($action == 'page_posts') {
    $page = Wo_PublicContent_PageById(Wo_PublicContent_Read('page_id', 0));
    if (empty($page)) {
        $page = Wo_PublicContent_PageByName(Wo_PublicContent_Read('page_name', ''));
    }
    if (empty($page)) {
        Wo_PublicContent_NotFound('Page not found.');
    } else {
        $response_data = Wo_PublicContent_Response(array('data' => Wo_PublicContent_Posts('page_id', $page['page_id'])));
    }
} else if ($action == 'group_posts') {
    $group = Wo_PublicContent_GroupById(Wo_PublicContent_Read('group_id', 0));
    if (empty($group)) {
        $group = Wo_PublicContent_GroupByName(Wo_PublicContent_Read('group_name', ''));
    }
    if (empty($group)) {
        Wo_PublicContent_NotFound('Group not found.');
    } else {
        $response_data = Wo_PublicContent_Response(array('data' => Wo_PublicContent_Posts('group_id', $group['group_id'])));
    }
} else if ($action == 'user_posts') {
    $response_data = Wo_PublicContent_Response(array('data' => Wo_PublicContent_UserPosts()));
} else if ($action == 'products') {
    $response_data = Wo_PublicContent_Response(array(
        'products' => Wo_PublicContent_Products(),
        'products_categories' => isset($wo['products_categories']) ? $wo['products_categories'] : array(),
        'products_sub_categories' => isset($wo['products_sub_categories']) ? $wo['products_sub_categories'] : array(),
        'distance_filter_available' => 0
    ));
} else if ($action == 'product') {
    $product_id = Wo_PublicContent_Read('product_id', '');
    $post_id = Wo_PublicContent_Read('post_id', '');
    $lookup_id = Wo_PublicContent_Read('id', 0);

    if (!empty($product_id)) {
        $product = Wo_PublicContent_ProductByProductId($product_id);
        if (empty($product)) {
            $product = Wo_PublicContent_ProductByPostId($product_id);
        }
    } else if (!empty($post_id)) {
        $product = Wo_PublicContent_ProductByPostId($post_id);
    } else {
        $product = Wo_PublicContent_ProductById($lookup_id);
    }

    if (empty($product)) {
        Wo_PublicContent_NotFound('Product not found.');
    } else {
        $response_data = Wo_PublicContent_Response(array('product' => $product, 'products' => array($product)));
    }
} else if ($action == 'blogs') {
    $response_data = Wo_PublicContent_Response(array('articles' => Wo_PublicContent_Blogs()));
} else if ($action == 'blog') {
    $blog = Wo_PublicContent_BlogById(Wo_PublicContent_Read('blog_id', 0));
    if (empty($blog)) {
        Wo_PublicContent_NotFound('Blog not found.');
    } else {
        $response_data = Wo_PublicContent_Response(array('data' => $blog));
    }
} else if ($action == 'offers') {
    $response_data = Wo_PublicContent_Response(array('data' => Wo_PublicContent_Offers()));
} else {
    $error_code = 400;
    $error_message = 'Public content action is invalid.';
}
