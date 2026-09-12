<?php

/**
 * Branded, table-based email templates.
 *
 * Images are sent as CID inline assets so the email remains branded even when
 * the recipient cannot reach the development or preview domain.
 */
final class EmailTemplate {
    public static function brandAssets(): array {
        return [
            [
                'path' => __DIR__ . '/../assets/logo.png',
                'cid' => 'tas3eerah-logo',
                'name' => 'tas3eerah-logo.png',
                'type' => 'image/png',
            ],
            [
                'path' => __DIR__ . '/../assets/hero-reference-art.png',
                'cid' => 'tas3eerah-hero',
                'name' => 'tas3eerah-hero.png',
                'type' => 'image/png',
            ],
        ];
    }

    public static function frame(string $content, string $preheader = ''): string {
        $preheader = htmlspecialchars($preheader, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return <<<HTML
<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2efe7;color:#17352a;font-family:Arial,Tahoma,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">$preheader</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2efe7">
  <tr><td align="center" style="padding:26px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #e6e0d3">
      <tr>
        <td align="center" style="padding:22px 24px;background:#f8f5ed;border-bottom:1px solid #e5dece">
          <img src="cid:tas3eerah-logo" width="170" alt="تسعيرة" style="display:block;width:170px;max-width:70%;height:auto;border:0">
        </td>
      </tr>
      <tr>
        <td style="padding:0;background:#103728">
          <img src="cid:tas3eerah-hero" width="640" alt="منصة تسعيرة" style="display:block;width:100%;height:auto;border:0">
        </td>
      </tr>
      <tr><td style="padding:30px 32px 34px">$content</td></tr>
      <tr>
        <td align="center" style="padding:18px 24px;background:#103728;color:#f8f5ed;font-size:12px;line-height:1.8">
          تسعيرة — منصة التسعير الذكي<br>
          <span style="color:#d7ae61">سعّر بثقة، أدر بذكاء</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }

    public static function simpleMessage(string $message, string $title = 'رسالة جديدة'): string {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        return self::frame(
            '<h1 style="margin:0 0 14px;color:#103728;font-size:22px">' . $safeTitle . '</h1>' .
            '<div style="font-size:15px;color:#405249;line-height:2">' . $safeMessage . '</div>',
            $safeTitle
        );
    }
}