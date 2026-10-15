/* Stage 11 AE Bridge Batch Runner (POC)
   This ExtendScript reads bridge/inbox/current.request.json (repo-relative), and writes bridge/outbox/current.response.json
   NOTE: For the POC, this script performs minimal actions: reads request, simulates success for the requested compName, and writes a response.
*/

(function () {
  try {
    var f = new File($.fileName);
    // Calculate repo root as two folders up from scripts location if possible
    var inbox = new File('bridge/inbox/current.request.json');
    if (!inbox.exists) {
      // Look for absolute path alternatives in case AE current dir differs. For POC, attempt to read relative first.
    }

    // Read request
    inbox.encoding = 'UTF-8';
    if (inbox.open('r')) {
      var raw = inbox.read();
      inbox.close();
    } else {
      raw = null;
    }

    var request = null;
    try {
      request = raw ? JSON.parse(raw) : null;
    } catch (e) {
      request = null;
    }

    var response = {
      responseVersion: '1.0.0',
      jobId: request && request.jobId ? request.jobId : 'unknown',
      status: 'succeeded',
      stepResults: []
    };

    if (request && Array.isArray(request.actions)) {
      for (var i = 0; i < request.actions.length; i++) {
        var act = request.actions[i];
        response.stepResults.push({ step: act.actionId || act.name || ('action-' + i), status: 'succeeded', details: 'Simulated AE POC execution for ' + (act.params && act.params.compName ? act.params.compName : (act.name || 'unknown')) });
      }
    }

    // Write outbox atomically: write temp then rename
    var outbox = new File('bridge/outbox/current.response.json.' + (new Date()).getTime() + '.tmp');
    outbox.encoding = 'UTF-8';
    if (outbox.open('w')) {
      outbox.write(JSON.stringify(response, null, 2));
      outbox.close();
      // Rename to canonical filename
      var finalFile = new File('bridge/outbox/current.response.json');
      try {
        if (finalFile.exists) finalFile.remove();
      } catch (e) {}
      outbox.rename('current.response.json');
    }

  } catch (err) {
    // best-effort error write
    try {
      var errFile = new File('bridge/outbox/current.response.json');
      errFile.encoding = 'UTF-8';
      if (errFile.open('w')) {
        errFile.write(JSON.stringify({ responseVersion: '1.0.0', jobId: 'unknown', status: 'failed', error: String(err) }, null, 2));
        errFile.close();
      }
    } catch (e) {}
  }
})();
