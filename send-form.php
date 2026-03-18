<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// Parse JSON body
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    // Fallback: try form-encoded data
    $input = $_POST;
}

if (empty($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Données manquantes']);
    exit;
}

// Email routing based on service
$emailMap = [
    'Planning Familial'    => 'planningoasisfamiliale@gmail.com',
    'Accueil des enfants'  => 'oasis.nancyjacques@gmail.com',
    '9 mois & après'       => '9moisetapres@gmail.com',
    'Autre'                => 'b.springuel@oasis-familiale.com',
];

$service    = $input['SERVICE'] ?? '';
$nom        = $input['NOM'] ?? '';
$date       = $input['DATE'] ?? '';
$codePostal = $input['CODE-POSTAL'] ?? '';
$email      = $input['EMAIL'] ?? '';
$gsm        = $input['GSM'] ?? '';
$message    = $input['MESSAGE'] ?? '';

// Determine recipient
$to = $emailMap[$service] ?? 'planningoasisfamiliale@gmail.com';

// Build email
$subject = "Contact site web - $service - $nom";

$body = "
<html>
<body style='font-family: Arial, sans-serif;'>
<h2 style='color: #2c5f2d;'>Nouveau message - Oasis Familiale</h2>
<table style='border-collapse: collapse; width: 100%; max-width: 600px;'>
    <tr style='background: #2c5f2d; color: white;'>
        <td colspan='2' style='padding: 12px; font-size: 18px;'>$service</td>
    </tr>
    <tr>
        <td style='padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; width: 140px;'>Nom</td>
        <td style='padding: 8px 12px; border: 1px solid #ddd;'>" . htmlspecialchars($nom) . "</td>
    </tr>
    <tr>
        <td style='padding: 8px 12px; border: 1px solid #ddd; font-weight: bold;'>Date de naissance</td>
        <td style='padding: 8px 12px; border: 1px solid #ddd;'>" . htmlspecialchars($date) . "</td>
    </tr>
    <tr>
        <td style='padding: 8px 12px; border: 1px solid #ddd; font-weight: bold;'>Code postal</td>
        <td style='padding: 8px 12px; border: 1px solid #ddd;'>" . htmlspecialchars($codePostal) . "</td>
    </tr>
    <tr>
        <td style='padding: 8px 12px; border: 1px solid #ddd; font-weight: bold;'>Email</td>
        <td style='padding: 8px 12px; border: 1px solid #ddd;'><a href='mailto:" . htmlspecialchars($email) . "'>" . htmlspecialchars($email) . "</a></td>
    </tr>
    <tr>
        <td style='padding: 8px 12px; border: 1px solid #ddd; font-weight: bold;'>GSM</td>
        <td style='padding: 8px 12px; border: 1px solid #ddd;'><a href='tel:" . htmlspecialchars($gsm) . "'>" . htmlspecialchars($gsm) . "</a></td>
    </tr>
    <tr>
        <td style='padding: 8px 12px; border: 1px solid #ddd; font-weight: bold; vertical-align: top;'>Message</td>
        <td style='padding: 8px 12px; border: 1px solid #ddd;'>" . nl2br(htmlspecialchars($message)) . "</td>
    </tr>
</table>
<p style='color: #888; font-size: 12px; margin-top: 20px;'>Ce message a été envoyé via le formulaire de contact du site oasis-familiale.com</p>
</body>
</html>";

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= "From: Site Oasis Familiale <noreply@oasis-familiale.com>\r\n";
$headers .= "Reply-To: " . htmlspecialchars($email) . "\r\n";

// Send email
$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Votre message a bien été envoyé.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'envoi. Veuillez réessayer.']);
}
