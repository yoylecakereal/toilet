import express from "express";
import multer from "multer";
import axios from "axios";
import { exec } from "child_process";
import fs from "fs";

const app = express();
const upload = multer({ dest: "/tmp" });

app.post(
  "/sign",
  upload.fields([
    { name: "cert", maxCount: 1 },
    { name: "profile", maxCount: 1 },
    { name: "ipa", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const cert = req.files.cert[0].path;
      const profile = req.files.profile[0].path;
      const ipa = req.files.ipa[0].path;
      const password = req.body.password;

      const outputIPA = "/tmp/signed.ipa";

      // ---- SIGNING COMMAND (placeholder) ----
      // Replace this with actual zsign command
      const cmd = `zsign -k ${cert} -p ${password} -m ${profile} -o ${outputIPA} ${ipa}`;

      await new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
          if (err) reject(stderr);
          else resolve(stdout);
        });
      });

      // ---- UPLOAD SIGNED IPA TO LITTERBOX ----
      const ipaData = fs.createReadStream(outputIPA);
      const ipaUpload = await axios.post(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        ipaData,
        {
          headers: {
            "Content-Type": "application/octet-stream"
          },
          params: {
            reqtype: "fileupload",
            time: "1h"
          }
        }
      );

      const ipaURL = ipaUpload.data;

      // ---- CREATE MANIFEST ----
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

      // ---- UPLOAD MANIFEST ----
      const manifestData = fs.createReadStream("/tmp/manifest.plist");
      const manifestUpload = await axios.post(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        manifestData,
        {
          headers: {
            "Content-Type": "application/octet-stream"
          },
          params: {
            reqtype: "fileupload",
            time: "1h"
          }
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
