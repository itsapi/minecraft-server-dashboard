const http = require('http');
const Promise = require('promise');
const readFile = Promise.denodeify(require('fs').readFile);
const writeFile = Promise.denodeify(require('fs').writeFile);

const hostname = '127.0.0.1';
const port = 3000;

const do_config_file = './do-config.json';


const readJSON = (path) => readFile(path).then(JSON.parse);

const getFileInt = (path) => readFile(path).then(Number);
const saveFileInt = (path, int) => writeFile(path, int.toString());

const prettyJSON = (json) => JSON.stringify(json, null, 2);


const get_dropplet_id = (cb) =>
{
  fs.readFile(require.resolve(path), (err, data) => {
    if (err)
    {
      cb(err);
    }
    else
    {
      cb(null, JSON.parse(data));
    }
  });
}


var do_api = null;


const createServer = (snapshot_id) =>
{
  return do_api.snapshotsGetById(snapshot_id)
  .then((data) => {
    var snapshot = data.body.snapshot;
    console.log('Creating droplet from:');
    console.log(snapshot);

    var [major, minor] = snapshot.name.split('-')[1].split('.').map(Number);

    return do_api.dropletsCreate({
      "name": `minecraft-${major}.${minor + 1}`,
      "region": snapshot.regions[0],
      "size": "s-4vcpu-8gb",
      "image": snapshot_id,
      "ssh_keys": ["0b:92:2d:0b:37:01:ab:de:40:d5:a3:02:4c:74:48:48"],
      "backups": false,
      "ipv6": true,
      "user_data": null,
      "private_networking": null,
      "volumes": null,
      "tags": []
    })
    .then((result) => result.body.droplet.id);
  });
}


const stopServer = (dropletId) =>
{
  return new Promise();
}


const serverStatus = (dropletId) =>
{
  return do_api.dropletsGetById(dropletId);
}


var server = http.createServer((req, res) => {
  const {method, url, headers} = req;

  res.setHeader('Content-Type', 'text/html');
  html  = '<!DOCTYPE html>';
  html += '<html>';
  html += '<head>';
  html += '<title>Minecraft Control Panel</title>';
  html += '</head>';
  html += '<body>';

  getFileInt('./running_droplet')
  .then((running_droplet) => {
    console.log(`Running droplet: ${running_droplet}`);

    if (url == '/start' && !running_droplet)
    {
      return getFileInt('./snapshot_id').then(createServer)
      .then((server_id) => saveFileInt('./running_droplet', server_id));

    }
    else
    if (url == '/stop' && running_droplet)
    {
      return stopServer(running_droplet);
    }

  })
  .then(() => {
    res.statusCode = 200;

    html += '<p><a href="/stop">Save and stop server</a></p>';
    html += '<p><a href="/start">Start server</a></p>';
  })
  .then(() => getFileInt('./running_droplet'))
  .then(serverStatus)
  .then((running_droplet) => {
    html += `<pre>Running droplet: ${prettyJSON(running_droplet.body.droplet)}</pre>`;
  })
  .catch((err) =>{
    console.log('Error:');
    console.log(err);
    res.statusCode = 500;
    html += `Error: <pre>${prettyJSON(err)}</pre>`;

  })
  .finally(() => {
    html += '<a href="/">Home</a>';
    html += '</body>';
    html += '</html>';
    res.end(html);
  });
});


function startServer()
{
  var DigitalOcean = require('do-wrapper').default;

  readJSON(do_config_file)
  .then((do_config) => {

    do_api = new DigitalOcean(do_config.token, 1024);
    return do_api.account();
  })
  .then((data) => {
    console.log(data.body);

    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });

  }).catch((err) => {
    console.log(err);
  });
}

startServer();
