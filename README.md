# AE2-Discord-Terminals
Some Discord Bot and CC:Tweaked Codes.
English Language is coming soon.

- Japanese
これはとある人の
> ae2の自動クラフトをスマホアプリから発注できれば旅行中のmod勢からしたらとても助かるのでは

という発言から生まれたプロジェクトです。
CC:TweakedとそのアドオンAdvanced PeripheralとApplied Energistics 2を連携させて自動クラフトなどの機能をDiscord上から行えるようにします。

## Installing - minecraft Setup

導入mods:
  - CC:Tweaked
  - Advanced Peripheral
  - Applied Energistics 2

もしサーバーとAPIが同じLAN上に存在する場合以下を変更する。
※マルチプレイで利用する際はこの設定の変更によってlocalhostにアクセスできるようになることに注意してください
> world/serverconfig/computercraft-server.toml
```toml
	[[http.rules]]
		host = "$private"
        # default: action = "deny"
        # ↓
		action = "allow"
```

(Advanced) ComputerにME Bridgeを接続し、ME BridgeにApplied Energistics 2のネットワークを接続する。

Computerを開きインストーラーを実行する

`wget run https://raw.githubusercontent.com/manmen2414/AE2-Discord-Terminals/main/computercraft/install.lua`

## Installing
```sh
git clone https://github.com/manmen2414/AE2-Discord-Terminals
cd AE2-Discord-Terminals
npm install
```
.env.devを.envにコピーし、tokenとAPIにアクセスするURLを入力する。
ポートはJSON-serverで変更しない限り3000。
(main.js:16で変更可能)

実行：`node main.js` or `npm run start`

