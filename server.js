console.log("🚀 Server starting...");

import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import util from "util";
import { exec } from "child_process";

const execPromise = util.promisify(exec);
const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.options("*", (req, res) => res.sendStatus(200));

// Use /var/tmp (Render has more space)
const upload = multer({ dest: "/var/tmp" });

app.post(
  "/sign",
  upload.fields([
    { name: "cert", maxCount: 1 },
    { name: "profile", maxCount: 1 },
    { name: "ipa", maxCount: 1 },
    { name: "password", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      console.log("📥 Received /sign request");

      const certP12 = req.files.cert?.[0]?.path;
      const profile = req.files.profile?.[0]?.path;
      const ipa = req.files.ipa?.[0]?.path;
      const password = req.body.password;

      if (!certP12 || !profile || !ipa || !password) {
        console.log("❌ Missing required fields");
        return res.status(400).json({ error: "Missing files or password" });
      }

      console.log("🔐 Extracting PEM files...");

      const certPem = "/var/tmp/cert.pem";
      const keyPem = "/var/tmp/key.pem";
      const outputIPA = "/var/tmp/signed.ipa";

      // Extract PEM cert
      await execPromise(
        `openssl pkcs12 -in ${certP12} -out ${certPem} -clcerts -nokeys -passin pass:${password}`
      );

      // Extract PEM key
      await execPromise(
        `openssl pkcs12 -in ${certP12} -out ${keyPem} -nocerts -nodes -passin pass:${password}`
      );

      console.log("✍️ Signing IPA with zsign...");

      await execPromise(
        `zsign -k ${keyPem} -c ${certPem} -p ${profile} -o ${outputIPA} ${ipa}`
      );

      console.log("📤 Uploading signed IPA to Litterbox...");

      const ipaUpload = await axios.post(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        fs.createReadStream(outputIPA),
        {
          headers: { "Content-Type": "application/octet-stream" },
          params: { reqtype: "fileupload", time: "1h" }
        }
      );

      const ipaURL = ipaUpload.data;

      console.log("📝 Creating manifest...");

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

      fs.writeFileSync("/var/tmp/manifest.plist", manifest);

      console.log("📤 Uploading manifest...");

      const manifestUpload = await axios.post(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        fs.createReadStream("/var/tmp/manifest.plist"),
        {
          headers: { "Content-Type": "application/octet-stream" },
          params: { reqtype: "fileupload", time: "1h" }
        }
      );

      const manifestURL = manifestUpload.data;

      const installURL =
        "itms-services://?action=download-manifest&url=" + manifestURL;

      console.log("✅ Signing complete:", installURL);

      res.json({ install_url: installURL });
    } catch (err) {
      console.error("❌ SIGN ERROR:", err);
      res.status(500).json({ error: err.toString() });
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 Server running on port", PORT));
