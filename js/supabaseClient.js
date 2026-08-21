(function (root) {
  var SUPABASE_URL = 'https://vabgbjzbxdlzyhrtxjdf.supabase.co';
  var SUPABASE_ANON_KEY =
    'sb_publishable_RrVdIdku3OR0sn83-CLLwA_3zHf_RG1';

  function getCreateClient() {
    var lib = root.supabase;
    if (lib && typeof lib.createClient === 'function') return lib.createClient;
    if (typeof root.createClient === 'function') return root.createClient;
    return null;
  }

  function init() {
    var createClient = getCreateClient();
    if (!createClient) {
      console.error(
        'Supabase no está disponible. Revisa que @supabase/supabase-js se haya cargado.'
      );
      return null;
    }
    var client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    root.kantekSupabase = client;
    return client;
  }

  root.initKantekSupabase = init;
  init();
})(window);
