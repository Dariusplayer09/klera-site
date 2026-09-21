/* Public site configuration.

   The Supabase key below is a PUBLISHABLE key. It is meant to sit in client code: it can
   only do what row-level security allows, and `supabase/waitlist.sql` grants it INSERT on
   the waitlist table and nothing else. It cannot read the waitlist back. Never put a
   service-role key here. */
window.KLERA = {
  supabaseUrl: "https://mstrcjcgsieixmlevrtv.supabase.co",
  supabaseKey: "sb_publishable__u4e-CWw7kYToPIRPlLW3A_UnDgrpSK",
  contactEmail: "lukasiewiczfilip07@gmail.com",
};
