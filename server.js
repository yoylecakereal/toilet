import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import util from "util";
import { exec } from "child_process";

const execPromise = util.promisify(exec);
const app = express();
const upload = multer({ dest: "/tmp" });

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // or your domain instead of *
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.options("*", (req, res) => {
  res.sendStatus(200);
});

app.post(
  "/sign",
  upload.fields([
    { name: "cert", maxCount: 1 },
    { name: "profile", maxCount: 1 },
    { name: "ipa", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const certP12 = req.files.cert[0].path;
      const profile = req.files.profile[0].path;
      const ipa = req.files.ipa[0].path;
      const password = req.body.password;

      const certPem = "/tmp/cert.pem";
      const keyPem = "/tmp/key.pem";
      const outputIPA = "/tmp/signed.ipa";

      // Extract PEM cert
      await execPromise(
        `openssl pkcs12 -in ${certP12} -out ${certPem} -clcerts -nokeys -passin pass:${password}`
      );

      // Extract PEM key
      await execPromise(
        `openssl pkcs12 -in ${certP12} -out ${keyPem} -nocerts -nodes -passin pass:${password}`
      );

      // Sign with isign
      await execPromise(
        `isign --certificate ${certPem} --key ${keyPem} --provisioning-profile ${profile} --output ${outputIPA} ${ipa}`
      );

      // Upload signed IPA to Litterbox
      const ipaUpload = await axios.post(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        fs.createReadStream(outputIPA),
        {
          headers: { "Content-Type": "application/octet-stream" },
          params: { reqtype: "fileupload", time: "1h" }
        }
      );

      const ipaURL = ipaUpload.data;

      // Create manifest
      const manifest = `
      <?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
      <plist version="1.0">
      <dict>
        <key>items</key>
        <array>
          <dict>
            <key>assets</key>
            <array>
              <dict>
                <key>kind</key><string>software-package</string>
                <key>url</key><string>${ipaURL}</string>
              </dict>
            </array>
            <key>metadata</key>
            <dict>
              <key>bundle-identifier</key><string>com.example.app</string>
              <key>bundle-version</key><string>1.0</string>
              <key>kind</key><string>software</string>
              <key>title</key><string>Signed App</string>
            </dict>
          </dict>
        </array>
      </dict>
      </plist>
      `;

      fs.writeFileSync("/tmp/manifest.plist", manifest);

      // Upload manifest
      const manifestUpload = await axios.post(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        fs.createReadStream("/tmp/manifest.plist"),
        {
          headers: { "Content-Type": "application/octet-stream" },
          params: { reqtype: "fileupload", time: "1h" }
        }
      );

      const manifestURL = manifestUpload.data;

      const installURL =
        "itms-services://?action=download-manifest&url=" + manifestURL;

      res.json({ install_url: installURL });
    } catch (err) {
      res.status(500).json({ error: err.toString() });
    }
  }
);

app.listen(3000, () => console.log("Server running on port 3000"));

