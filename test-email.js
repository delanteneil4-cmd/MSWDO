const SERVICE_ID = 'service_qvc8npd';
const TEMPLATE_ID = 'template_51cxyho';
const PUBLIC_KEY = 'q9RN6Ns1_Gi5N21B1';

async function testEmail() {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        template_params: {
          to_email: 'test@example.com',
          to_name: 'Test User',
          message: 'This is a test message.'
        }
      })
    });
    
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (error) {
    console.error('Failed!', error);
  }
}

testEmail();
