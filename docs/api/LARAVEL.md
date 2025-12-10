# 📲 LARAVEL INTEGRATION EXAMPLE

**Cara mengintegrasikan WAG Gateway ke Laravel**

---

## SETUP

### 1. Install Package
```bash
composer require guzzlehttp/guzzle
```

### 2. Config `.env`
```env
WAG_GATEWAY_URL=http://localhost:3000
WAG_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0
```

### 3. Create Service
```bash
php artisan make:service WagGatewayService
```

---

## SERVICE CODE

**`app/Services/WagGatewayService.php`**

```php
<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class WagGatewayService
{
    private $client;
    private $gatewayUrl;
    private $wallet;

    public function __construct()
    {
        $this->client = new Client();
        $this->gatewayUrl = config('services.wag.gateway_url');
        $this->wallet = config('services.wag.wallet_address');
    }

    /**
     * Kirim single pesan WhatsApp
     */
    public function sendMessage(string $phone, string $message): array
    {
        try {
            $response = $this->client->post("{$this->gatewayUrl}/send-message", [
                'json' => [
                    'number' => $phone,
                    'message' => $message,
                    'wallet' => $this->wallet
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            return [
                'status' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Kirim bulk messages
     */
    public function sendBulk(array $messages): array
    {
        try {
            $response = $this->client->post("{$this->gatewayUrl}/send-bulk", [
                'json' => [
                    'messages' => $messages,
                    'wallet' => $this->wallet
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            return [
                'status' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Check license status
     */
    public function checkLicense(): array
    {
        try {
            $response = $this->client->post("{$this->gatewayUrl}/check-license", [
                'json' => [
                    'wallet' => $this->wallet
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            return [
                'status' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get server health
     */
    public function health(): array
    {
        try {
            $response = $this->client->get("{$this->gatewayUrl}/health");
            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            return [
                'status' => 'offline'
            ];
        }
    }
}
```

---

## CONTROLLER EXAMPLE

**`app/Http/Controllers/NotificationController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\WagGatewayService;

class NotificationController extends Controller
{
    private $wagService;

    public function __construct(WagGatewayService $wagService)
    {
        $this->wagService = $wagService;
    }

    /**
     * Send order confirmation
     */
    public function sendOrderConfirmation(Order $order)
    {
        $message = "Pesanan #{$order->id} dikonfirmasi! Total: Rp " . 
                   number_format($order->total, 0, ',', '.');

        $result = $this->wagService->sendMessage(
            $order->customer->phone,
            $message
        );

        if ($result['status']) {
            return response()->json(['message' => 'Notifikasi terkirim']);
        }

        return response()->json(['error' => $result['message']], 500);
    }

    /**
     * Send shipping notification
     */
    public function sendShippingNotif(Order $order)
    {
        $message = "✅ Pesanan #{$order->id} siap dikirim!\n" .
                   "Resi: {$order->shipping_number}\n" .
                   "Cek status di: https://yourapp.com/track/{$order->id}";

        return $this->wagService->sendMessage(
            $order->customer->phone,
            $message
        );
    }

    /**
     * Send bulk reminders
     */
    public function sendBulkReminder()
    {
        $orders = Order::where('status', 'pending')
                       ->where('created_at', '<', now()->subDays(3))
                       ->get();

        $messages = $orders->map(fn($order) => [
            'number' => $order->customer->phone,
            'message' => "Reminder: Pesanan #{$order->id} belum dibayar!"
        ])->toArray();

        return $this->wagService->sendBulk($messages);
    }

    /**
     * Check gateway status
     */
    public function checkGatewayStatus()
    {
        $health = $this->wagService->health();
        $license = $this->wagService->checkLicense();

        return response()->json([
            'gateway' => $health,
            'license' => $license
        ]);
    }
}
```

---

## ROUTES

**`routes/api.php`**

```php
Route::post('/notify/order-confirmation/{order}', 
    [NotificationController::class, 'sendOrderConfirmation']);

Route::post('/notify/shipping/{order}', 
    [NotificationController::class, 'sendShippingNotif']);

Route::post('/notify/bulk-reminder', 
    [NotificationController::class, 'sendBulkReminder']);

Route::get('/gateway-status', 
    [NotificationController::class, 'checkGatewayStatus']);
```

---

## MIDDLEWARE (OPTIONAL)

Check gateway health sebelum process:

```php
<?php

namespace App\Http\Middleware;

use App\Services\WagGatewayService;

class CheckWagGateway
{
    public function handle($request, $next)
    {
        $wag = app(WagGatewayService::class);
        $health = $wag->health();

        if ($health['status'] !== 'ready') {
            return response()->json([
                'error' => 'WAG Gateway not ready'
            ], 503);
        }

        return $next($request);
    }
}
```

Gunakan di Controller:
```php
public function __construct()
{
    $this->middleware('wag.gateway');
}
```

---

## TESTING WITH POSTMAN

```
POST http://localhost:8000/api/notify/order-confirmation/1
Headers: Accept: application/json
```

---

**Laravel integration complete!** 🎉
