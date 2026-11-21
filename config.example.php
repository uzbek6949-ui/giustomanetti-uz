<?php
/* ============================================================
   NAMUNA FAYL. Buni config.php nomi bilan nusxalang va
   o'z qiymatlaringizni yozing.

       copy config.example.php config.php

   config.php GitHub'ga YUBORILMAYDI (.gitignore ichida),
   shuning uchun token sir bo'lib qoladi.

   LXC/VPS serverda bu faylni deploy/install-lxc.sh o'zi yozadi
   (TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_IDS dan). Tekshirish:
       php deploy/tg-test.php            sinov xabari yuboradi
       php deploy/tg-test.php --updates  guruh chat ID sini topishga yordam beradi
   ============================================================ */

return [
  // @BotFather bergan token
  'token' => '0000000000:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',

  // Ariza kimga kelsin. Telegram chat ID (raqam) yoki guruh ID (-100... bilan).
  // Bir nechta bo'lsa vergul bilan: ['111111111', '-1002222222222']
  'chats' => ['000000000'],

  // Ixtiyoriy. Faqat sinov uchun: Telegram API o'rniga boshqa manzil
  // (masalan lokal soxta server). Odatda yozilmaydi.
  // 'api_base' => 'https://api.telegram.org',

  // Ixtiyoriy. Xabardagi vaqt qaysi mintaqada (standart: Asia/Tashkent).
  // 'timezone' => 'Asia/Tashkent',
];
