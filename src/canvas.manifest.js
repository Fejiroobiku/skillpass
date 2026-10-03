export const manifest = {
  screens: {
    scr_7cxa2m: { name: "Sign in", route: "/login", state: { "session": null }, position: { "x": 160, "y": 1820 } },
    scr_7jaa7d: { name: "Register", route: "/register", state: { "session": null }, position: { "x": 1560, "y": 1820 } },
    scr_xbh1w5: { name: "Public verify – search", route: "/verify", state: { "session": null }, position: { "x": 160, "y": 3800 } },
    scr_shbtwh: { name: "Public verify – valid", route: "/verify/SP-2BNC-8QPE", state: { "session": null }, position: { "x": 1560, "y": 3800 } },
    scr_cjpot6: { name: "Public verify – revoked", route: "/verify/SP-2DVS-8LQJ", state: { "session": null }, position: { "x": 2960, "y": 3800 } },
    scr_yjxdum: { name: "Public passport", route: "/passport/a1", state: { "session": null }, position: { "x": 160, "y": 5780 } },
    scr_zv7ozl: { name: "Trainer dashboard", route: "/trainer", state: { "session": "t1" }, position: { "x": 160, "y": 7760 } },
    scr_ablnep: { name: "Trainer – awaiting approval", route: "/trainer", state: { "session": "t5" }, position: { "x": 1560, "y": 7760 } },
    scr_btc3j3: { name: "Issue credential", route: "/trainer/issue", state: { "session": "t1" }, position: { "x": 2960, "y": 7760 } },
    scr_xfyxdt: { name: "Trainer credentials", route: "/trainer/credentials", state: { "session": "t1" }, position: { "x": 4360, "y": 7760 } },
    scr_ztxhl0: { name: "Trainer apprentices", route: "/trainer/apprentices", state: { "session": "t1" }, position: { "x": 5760, "y": 7760 } },
    scr_gipg4q: { name: "Skill framework", route: "/trainer/skills", state: { "session": "t1" }, position: { "x": 7160, "y": 7760 } },
    scr_5qnz0x: { name: "Skills passport", route: "/apprentice", state: { "session": "a1" }, position: { "x": 160, "y": 9740 } },
    scr_7ektpf: { name: "Confirm & report", route: "/apprentice/confirm", state: { "session": "a1" }, position: { "x": 2960, "y": 9740 } },
    scr_up7914: { name: "Job referrals", route: "/apprentice/jobs", state: { "session": "a1" }, position: { "x": 1560, "y": 9740 } },
    scr_smrxgm: { name: "Apprentice alerts", route: "/notifications", state: { "session": "a1" }, position: { "x": 4360, "y": 9740 } },
    scr_n7guax: { name: "Employer verify & co-sign", route: "/employer", state: { "session": "e1" }, position: { "x": 160, "y": 11720 } },
    scr_v7iedp: { name: "Jobs & matches", route: "/employer/jobs", state: { "session": "e1" }, position: { "x": 1560, "y": 11720 } },
    scr_1dc2cf: { name: "Employer feedback", route: "/employer/feedback", state: { "session": "e1" }, position: { "x": 2960, "y": 11720 } },
    scr_w7ow5y: { name: "Pilot metrics", route: "/admin", state: { "session": "ad1" }, position: { "x": 160, "y": 13700 } },
    scr_vhfbef: { name: "Review queue", route: "/admin/review", state: { "session": "ad1" }, position: { "x": 1560, "y": 13700 } },
    scr_r9lmua: { name: "Users", route: "/admin/users", state: { "session": "ad1" }, position: { "x": 2960, "y": 13700 } },
    scr_1xtzx4: { name: "Trades & skills", route: "/admin/skills", state: { "session": "ad1" }, position: { "x": 4360, "y": 13700 } },
    scr_3rrdjv: { name: "Audit log", route: "/admin/audit", state: { "session": "ad1" }, position: { "x": 5760, "y": 13700 } },
    scr_z8jt3h: { name: "Admin settings", route: "/admin/settings", state: { "session": "ad1" }, position: { "x": 7160, "y": 13700 } },
    scr_5hs7ca: { name: "My profile", route: "/profile", state: { "session": "t1" }, position: { "x": 1400, "y": 0 }, isDefaultRow: true },
    scr_amqz2l: { name: "Usability survey", route: "/survey", state: { "session": "t1" }, position: { "x": 2800, "y": 0 }, isDefaultRow: true }
  },
  sections: {
    sec_qjz1u0: { name: "Authentication", x: 0, y: 1600, width: 2920, height: 1180 },
    sec_c8iwfg: { name: "Public Verify", x: 0, y: 3580, width: 4320, height: 1180 },
    sec_2yjse3: { name: "Public Passport", x: 0, y: 5560, width: 1520, height: 1180 },
    sec_fe8cow: { name: "Trainer Dashboard & Management", x: 0, y: 7540, width: 8520, height: 1180 },
    sec_a3mo2r: { name: "Apprentice Skills & Opportunities", x: 0, y: 9520, width: 5720, height: 1180 },
    sec_4vony9: { name: "Employer Verification & Jobs", x: 0, y: 11500, width: 4320, height: 1180 },
    sec_mdo05y: { name: "Admin Management", x: 0, y: 13480, width: 8520, height: 1180 }
  },
  layers: [
  { kind: "screen", id: "scr_5hs7ca" },
  { kind: "screen", id: "scr_amqz2l" },
  { kind: "section", id: "sec_qjz1u0", children: [
    { kind: "screen", id: "scr_7cxa2m" },
    { kind: "screen", id: "scr_7jaa7d" }]
  },
  { kind: "section", id: "sec_c8iwfg", children: [
    { kind: "screen", id: "scr_xbh1w5" },
    { kind: "screen", id: "scr_shbtwh" },
    { kind: "screen", id: "scr_cjpot6" }]
  },
  { kind: "section", id: "sec_2yjse3", children: [
    { kind: "screen", id: "scr_yjxdum" }]
  },
  { kind: "section", id: "sec_fe8cow", children: [
    { kind: "screen", id: "scr_zv7ozl" },
    { kind: "screen", id: "scr_ablnep" },
    { kind: "screen", id: "scr_btc3j3" },
    { kind: "screen", id: "scr_xfyxdt" },
    { kind: "screen", id: "scr_ztxhl0" },
    { kind: "screen", id: "scr_gipg4q" }]
  },
  { kind: "section", id: "sec_a3mo2r", children: [
    { kind: "screen", id: "scr_5qnz0x" },
    { kind: "screen", id: "scr_up7914" },
    { kind: "screen", id: "scr_7ektpf" },
    { kind: "screen", id: "scr_smrxgm" }]
  },
  { kind: "section", id: "sec_4vony9", children: [
    { kind: "screen", id: "scr_n7guax" },
    { kind: "screen", id: "scr_v7iedp" },
    { kind: "screen", id: "scr_1dc2cf" }]
  },
  { kind: "section", id: "sec_mdo05y", children: [
    { kind: "screen", id: "scr_w7ow5y" },
    { kind: "screen", id: "scr_vhfbef" },
    { kind: "screen", id: "scr_r9lmua" },
    { kind: "screen", id: "scr_1xtzx4" },
    { kind: "screen", id: "scr_3rrdjv" },
    { kind: "screen", id: "scr_z8jt3h" }]
  }]

};