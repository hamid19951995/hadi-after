(function(){
  alert("AE Script Running...");

  function toSimpleJson(data) {
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return '"' + data.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);
    if (data instanceof Array) {
      var arr = [];
      for (var i = 0; i < data.length; i++) arr.push(toSimpleJson(data[i]));
      return '[' + arr.join(', ') + ']';
    }
    var pairs = [];
    for (var k in data) {
      if (data.hasOwnProperty(k)) {
        pairs.push('"' + k + '": ' + toSimpleJson(data[k]));
      }
    }
    return '{ ' + pairs.join(', ') + ' }';
  }

  function writeResult(obj){
    try{
      var out = new File(new File($.fileName).parent.fsName + '/ae-smoke-result.json');
      out.encoding = 'UTF-8';
      if (out.open('w')){
        out.write(toSimpleJson(obj));
        out.close();
      }
    }catch(e){
      alert('WRITE ERROR: ' + e.toString());
    }
  }

  try{
    var scriptDir = new File($.fileName).parent.fsName;
    var inputFile = new File(scriptDir + '/harness-input.json');

    if (!inputFile.exists){
      alert('Error: harness-input.json not found in:\n' + scriptDir);
      writeResult({ ok: false, message: 'harness input not found', path: inputFile.fsName });
      return;
    }

    inputFile.encoding = 'UTF-8';
    if (!inputFile.open('r')) {
      alert('Error opening harness-input.json');
      return;
    }
    var content = inputFile.read();
    inputFile.close();

    // Safe parse for ExtendScript
    var obj;
    try {
      obj = eval('(' + content + ')');
    } catch(err) {
      writeResult({ ok: false, message: 'JSON parse error', error: err.toString() });
      return;
    }

    var localPath = obj.localPath;
    if (!localPath){
      writeResult({ ok: false, message: 'localPath missing in harness input' });
      return;
    }

    var fileToImport = new File(localPath);
    if (!fileToImport.exists){
      alert('Local media file not found:\n' + localPath);
      writeResult({ ok: false, message: 'local file not found', path: localPath });
      return;
    }

    // Import footage into After Effects
    app.beginUndoGroup('AE Harness Import');
    var importOptions = new ImportOptions(fileToImport);
    var item = app.project.importFile(importOptions);
    app.endUndoGroup();

    var summary = {
      ok: true,
      imported: item ? item.name : 'Unknown',
      path: fileToImport.fsName
    };

    writeResult(summary);
    alert('SUCCESS: Imported ' + (item ? item.name : 'item') + ' successfully!');

  } catch(e) {
    alert('GENERAL ERROR: ' + e.toString());
    writeResult({ ok: false, error: e.toString() });
  }
})();
