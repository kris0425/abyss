# Deploy Notes

這個 Discord bot 不應該把 `.env` 上傳到 GitHub。

部署到雲端主機時，請在平台的 Environment Variables 設定：

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `DASHBOARD_PORT` 可不填

啟動指令：

```bash
npm install
npm start
```

註冊 slash commands：

```bash
npm run register
```

如果使用 Render/Railway/Fly.io 這類主機，服務類型請選 Background Worker / Worker，不要選靜態網站。
