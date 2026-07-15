import { createClient } from '@supabase/supabase-js';

const url = 'https://bigarvjahnxiuovepaxm.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZ2FydmphaG54aXVvdmVwYXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjc0MjUsImV4cCI6MjA5NDc0MzQyNX0.t6PAcFIUs1PS77MymF4nmMbIaN-YCiADzOhk5R9_0u4';
const supabase = createClient(url, key);

const accounts = [
  { email: 'giadinh@securitytech.vn', role: 'family_owner' },
  { email: 'thanhvien@securitytech.vn', role: 'family_member' },
  { email: 'baove@securitytech.vn', role: 'security_admin' },
  { email: 'nhanvienbaove@securitytech.vn', role: 'security_staff' }
];

async function run() {
  for (const acc of accounts) {
    const { data, error } = await supabase.auth.signUp({
      email: acc.email,
      password: 'Demo@12345',
    });
    if (error) {
      console.log('Error signing up', acc.email, error.message);
      continue;
    }
    const user = data?.user;
    if (user) {
      console.log('Created', acc.email, user.id);
      const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: user.id, role: acc.role });
      if (roleErr) {
        console.log('Error setting role', acc.email, roleErr.message);
      } else {
        console.log('Role set', acc.role);
      }
    }
  }
}
run();

