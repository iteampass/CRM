# Password reset

Forgot password uses Supabase Auth to send a recovery email. The link opens `/auth?tab=reset`, where the recipient can set and confirm a new password. Invalid or expired sessions show an error; successful resets return the user to login.

In Supabase Authentication → URL Configuration, allow `http://localhost:8080/auth?tab=reset` (adjust the local port) and the corresponding production URL. Configure Supabase Auth email/SMTP delivery for production; the application's Resend API key does not configure Supabase Auth emails.

See [Supabase password reset documentation](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).
