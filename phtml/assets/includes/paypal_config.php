<?php
$url = "https://api-m.sandbox.paypal.com";
if ($wo["config"]["paypal_mode"] == 'live') {
    $url = "https://api-m.paypal.com";
}

$wo['paypal_access_token'] = null;
$wo['paypal_access_token_error'] = '';
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url . '/v1/oauth2/token');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
curl_setopt($ch, CURLOPT_USERPWD, $wo["config"]["paypal_id"] . ':' . $wo["config"]["paypal_secret"]);

$headers = array();
$headers[] = 'Content-Type: application/x-www-form-urlencoded';
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$result = curl_exec($ch);
if (curl_errno($ch)) {
  $wo['paypal_access_token_error'] = curl_error($ch);
}
curl_close($ch);
$result = json_decode($result);
if (!empty($result->access_token)) {
  $wo['paypal_access_token'] = $result->access_token;
}
elseif (!empty($result->error_description)) {
  $wo['paypal_access_token_error'] = $result->error_description;
}
elseif (!empty($result->error)) {
  $wo['paypal_access_token_error'] = $result->error;
}
