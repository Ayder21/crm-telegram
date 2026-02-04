import { supabase } from './supabase/client';

export async function seedUser() {
    // Проверяем, есть ли пользователи
    const { data } = await supabase.from('profiles').select('*').limit(1);
    if (data && data.length > 0) return data[0].id;

    // В Supabase создание пользователя в таблице profiles обычно триггерится регистрацией в auth.users.
    // Но мы можем создать запись вручную, если отключим foreign key constraint или (правильнее) создадим через Auth API.
    // Но Auth API требует service_role key для администрирования.

    // Для MVP Dashboard: просто хардкодим ID или просим юзера ввести его, 
    // или (лучший вариант) просто показываем Settings, где юзер сам себя идентифицирует (небезопасно, но для демо ок).

    return "00000000-0000-0000-0000-000000000000"; // Placeholder
}

