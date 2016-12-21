const Drone = require('drone-node');
const plugin = new Drone.Plugin();

const PromiseFtp = require('promise-ftp');

const path = require('path');
const fs = require('fs');
const shelljs = require('shelljs');

const do_upload = function (workspace, vargs) {

  if (!vargs.host) {
    console.log('Parameter missing: FTP server host');
    process.exit(1);
  }

  var ftp = new PromiseFtp();

  var uploadFile = function (file) {
    var src = path.join(workspace.path, file);
    var dest = path.join(vargs.destination_path, vargs.flat ? path.basename(file) : file);
    if (fs.lstatSync(src).isDirectory()) {
      if (vargs.flat) {
        return true;
      }
      return ftp.mkdir(dest, true);
    }
    return ftp.put(src, dest);
  };

  console.log('Connecting to ' + vargs.host);

  ftp.connect({
    host: vargs.host,
    port: vargs.port,
    user: vargs.username,
    password: vargs.password,
    secure: vargs.secure
  }).then(function () {
    console.log('Connection successful.');

    shelljs.config.silent = true;
    shelljs.pushd(workspace.path);
    var files = shelljs.find(vargs.files);
    shelljs.popd();

    return Promise.all(files.map(uploadFile));
  }).then(function() {
    console.log('Upload successful');
    ftp.logout();
    process.exit(0)
  }).catch(function(err) {
    console.log('An error happened: ' + err);
    process.exit(2)
  });
};

plugin.parse().then((params) => {

  // gets build and repository information for
  // the current running build
  const build = params.build;
  const repo  = params.repo;
  const workspace = params.workspace;

  // gets plugin-specific parameters defined in
  // the .drone.yml file
  const vargs = params.vargs;

  vargs.files                || (vargs.files = []);
  vargs.secure !== undefined || (vargs.secure = true);
  vargs.destination_path     || (vargs.destination_path = '/');
  vargs.flat !== undefined   || (vargs.flat = true);

  do_upload(workspace, vargs);
});
