// sample AE ExtendScript used for testing runScript manifest flow
(function(){
  try{
    $.writeln('Sample script running');
    // Simple non-destructive check
    var alive = true;
    if (typeof alive === 'boolean') {
      // return string to host
      alive = 'ok';
    }
    alive;
  }catch(e){ $.writeln('ERROR:'+e.toString()); }
})();
