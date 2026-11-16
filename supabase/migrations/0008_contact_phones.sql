-- AURALIS — two public contact lines.
-- support_phone: the maker's direct number (orders / consultation).
-- admin_phone:   the channel & site admin's coordination number.
-- Stored as plain digits; the UI renders one continuous run of Persian digits
-- so Telegram's RTL bidi does not reorder dashed groups.

alter table store_settings add column if not exists admin_phone text;
alter table store_agent_settings add column if not exists admin_phone text not null default '';

update store_settings
set support_phone = '09132389654',
    admin_phone = '09014837991',
    updated_at = now()
where id = 1;

update store_agent_settings
set support_phone = '09132389654',
    admin_phone = '09014837991',
    updated_at = now()
where id = 1;
