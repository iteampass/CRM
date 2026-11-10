-- Read-only inventory; run separately on source and destination as administrator.
-- Exact counts only: no passwords, API keys, customer rows or file contents.
SELECT n.nspname AS schema, c.relname AS table_name,
  ((xpath('/row/n/text()', query_to_xml(
    format('SELECT count(*) AS n FROM %I.%I',n.nspname,c.relname),false,true,'')))[1]::text)::bigint AS rows
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname IN ('public','handyflow')
ORDER BY 1,2;
SELECT count(*) AS auth_users,count(email_confirmed_at) AS confirmed_users FROM auth.users;
SELECT provider,count(*) FROM auth.identities GROUP BY provider ORDER BY provider;
SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY id;
SELECT bucket_id,count(*) AS object_count FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id;
SELECT schemaname,tablename FROM pg_publication_tables WHERE pubname='supabase_realtime';
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal;
SELECT tc.table_schema,tc.table_name,kcu.column_name,ccu.table_schema AS foreign_schema,
       ccu.table_name AS foreign_table,ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_catalog,constraint_schema,constraint_name)
JOIN information_schema.constraint_column_usage ccu USING (constraint_catalog,constraint_schema,constraint_name)
WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema IN ('public','handyflow')
ORDER BY 1,2,3;
-- Export these separately to protected local JSON files for the offline planner.
-- SELECT coalesce(json_agg(json_build_object('id',id,'email',email,
--   'email_confirmed_at',email_confirmed_at)), '[]'::json) FROM auth.users;
-- Do not export password hashes, tokens or identities through chat/tool output.
