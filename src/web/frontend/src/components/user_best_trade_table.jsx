import { useState, useCallback, memo, useMemo,useRef } from "react";
const DATA = JSON.parse(`{"price_oracle": {"Manifold Bond": 14.89516129032258,"Momentous Bond": 15.450980392156863},"trade_options": [{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "65035e20e075a0025f710513"},{"items": {"Momentous Bond": {"rank": null,"price": 35,"quantity": 1}},"total_price": 35,"total_variation": 19.549019607843135,"user_id": "6613dc0f5ca3220295c6faad"},{"items": {"Manifold Bond": {"rank": 0,"price": 45,"quantity": 1},"Momentous Bond": {"rank": null,"price": 35,"quantity": 1}},"total_price": 80,"total_variation": 49.65385831752056,"user_id": "6613dc0f5ca3220295c6faad"},{"items": {"Momentous Bond": {"rank": null,"price": 100,"quantity": 1}},"total_price": 100,"total_variation": 84.54901960784314,"user_id": "5e64c4f626753903b5fcaf0f"},{"items": {"Manifold Bond": {"rank": 0,"price": 100,"quantity": 1},"Momentous Bond": {"rank": null,"price": 100,"quantity": 1}},"total_price": 200,"total_variation": 169.65385831752056,"user_id": "5e64c4f626753903b5fcaf0f"},{"items": {"Momentous Bond": {"rank": null,"price": 16,"quantity": 1}},"total_price": 16,"total_variation": 0.5490196078431371,"user_id": "64d8e02c1dd0eb006b45c5e4"},{"items": {"Momentous Bond": {"rank": null,"price": 30,"quantity": 1}},"total_price": 30,"total_variation": 14.549019607843137,"user_id": "646de24d3a1eb2104bbd68a3"},{"items": {"Manifold Bond": {"rank": 0,"price": 35,"quantity": 1},"Momentous Bond": {"rank": null,"price": 30,"quantity": 1}},"total_price": 65,"total_variation": 34.65385831752056,"user_id": "646de24d3a1eb2104bbd68a3"},{"items": {"Momentous Bond": {"rank": null,"price": 17,"quantity": 1}},"total_price": 17,"total_variation": 1.549019607843137,"user_id": "5c1a7c80ccdafb005ecec74d"},{"items": {"Momentous Bond": {"rank": null,"price": 26,"quantity": 1}},"total_price": 26,"total_variation": 10.549019607843137,"user_id": "6737fd69b69dfa0048c1692e"},{"items": {"Manifold Bond": {"rank": 0,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 10.10483870967742,"user_id": "62af36b76dd0a008b89ceebc"},{"items": {"Manifold Bond": {"rank": 0,"price": 25,"quantity": 1},"Momentous Bond": {"rank": null,"price": 30,"quantity": 1}},"total_price": 55,"total_variation": 24.65385831752056,"user_id": "62af36b76dd0a008b89ceebc"},{"items": {"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 9.549019607843137,"user_id": "595d46490f313944640ebf56"},{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "68ecb6c7e520750091cceda9"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1},"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 40,"total_variation": 9.653858317520557,"user_id": "68ecb6c7e520750091cceda9"},{"items": {"Momentous Bond": {"rank": null,"price": 29,"quantity": 1}},"total_price": 29,"total_variation": 13.549019607843137,"user_id": "5f769400824fa301dcb66fed"},{"items": {"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 9.549019607843137,"user_id": "690aeb5dc4dcef0007d1981e"},{"items": {"Manifold Bond": {"rank": 0,"price": 25,"quantity": 1},"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 50,"total_variation": 19.65385831752056,"user_id": "690aeb5dc4dcef0007d1981e"},{"items": {"Momentous Bond": {"rank": null,"price": 50,"quantity": 1}},"total_price": 50,"total_variation": 34.549019607843135,"user_id": "653953ea98b18f00bbafae56"},{"items": {"Momentous Bond": {"rank": null,"price": 22,"quantity": 1}},"total_price": 22,"total_variation": 6.549019607843137,"user_id": "5d297dfc5c9cca00c6afdace"},{"items": {"Manifold Bond": {"rank": 0,"price": 25,"quantity": 1},"Momentous Bond": {"rank": null,"price": 22,"quantity": 1}},"total_price": 47,"total_variation": 16.65385831752056,"user_id": "5d297dfc5c9cca00c6afdace"},{"items": {"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": -0.4509803921568629,"user_id": "63c04103e239a20deedb59f4"},{"items": {"Momentous Bond": {"rank": null,"price": 19,"quantity": 1}},"total_price": 19,"total_variation": 3.549019607843137,"user_id": "6915fe99a450720007ab5750"},{"items": {"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 9.549019607843137,"user_id": "640d7b0e357172014729dc7b"},{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "66b23ddd5ca32222935a8dbb"},{"items": {"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": -0.4509803921568629,"user_id": "68f3a548bcb10f001f78de99"},{"items": {"Momentous Bond": {"rank": null,"price": 27,"quantity": 1}},"total_price": 27,"total_variation": 11.549019607843137,"user_id": "694c07c8d65c7b00b5809d46"},{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "63884fee3a8f8d09571bfad6"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1},"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 40,"total_variation": 9.653858317520557,"user_id": "63884fee3a8f8d09571bfad6"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "667813e6bc707e03d085ca4d"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1},"Momentous Bond": {"rank": null,"price": 19,"quantity": 1}},"total_price": 34,"total_variation": 3.653858317520557,"user_id": "667813e6bc707e03d085ca4d"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 5.10483870967742,"user_id": "5d63cc0035f88601f1565113"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1},"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 45,"total_variation": 14.653858317520557,"user_id": "5d63cc0035f88601f1565113"},{"items": {"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 9.549019607843137,"user_id": "6570930c0549dc1e8b90cbad"},{"items": {"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 9.549019607843137,"user_id": "68aca12b2d340f0009034063"},{"items": {"Manifold Bond": {"rank": 0,"price": 19,"quantity": 1}},"total_price": 19,"total_variation": 4.10483870967742,"user_id": "583dc12dd3ffb612d3e65f53"},{"items": {"Manifold Bond": {"rank": 0,"price": 19,"quantity": 1},"Momentous Bond": {"rank": null,"price": 24,"quantity": 1}},"total_price": 43,"total_variation": 12.653858317520557,"user_id": "583dc12dd3ffb612d3e65f53"},{"items": {"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": -0.4509803921568629,"user_id": "658317f52d2bbe2a19bf2805"},{"items": {"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 9.549019607843137,"user_id": "5d541cfbcf7a270014b98ba6"},{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "690c1751b06cb80008948749"},{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "641b11f2816094044e6701f4"},{"items": {"Manifold Bond": {"rank": 0,"price": 25,"quantity": 1},"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 45,"total_variation": 14.653858317520557,"user_id": "641b11f2816094044e6701f4"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 5.10483870967742,"user_id": "67b480f685e707000826261e"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1},"Momentous Bond": {"rank": null,"price": 24,"quantity": 1}},"total_price": 44,"total_variation": 13.653858317520557,"user_id": "67b480f685e707000826261e"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1},"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 29,"total_variation": -1.346141682479443,"user_id": "691eacba0ded1c0020e599b7"},{"items": {"Momentous Bond": {"rank": null,"price": 16,"quantity": 1}},"total_price": 16,"total_variation": 0.5490196078431371,"user_id": "5a6a5296f629d7027485ee73"},{"items": {"Momentous Bond": {"rank": null,"price": 22,"quantity": 1}},"total_price": 22,"total_variation": 6.549019607843137,"user_id": "68be66a6a537190009d783fa"},{"items": {"Momentous Bond": {"rank": null,"price": 18,"quantity": 1}},"total_price": 18,"total_variation": 2.549019607843137,"user_id": "5a862b9e0a0674075736ea39"},{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "5ca097f6f8f1c502a2f21f53"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1},"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 40,"total_variation": 9.653858317520557,"user_id": "5ca097f6f8f1c502a2f21f53"},{"items": {"Momentous Bond": {"rank": null,"price": 22,"quantity": 1}},"total_price": 22,"total_variation": 6.549019607843137,"user_id": "64256bc3816094079cdce83d"},{"items": {"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": -0.4509803921568629,"user_id": "65a55acbe48ca602710219d7"},{"items": {"Momentous Bond": {"rank": null,"price": 18,"quantity": 1}},"total_price": 18,"total_variation": 2.549019607843137,"user_id": "590459dc0f313934c43f29e7"},{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "62384130f40b6303928269b4"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1},"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 40,"total_variation": 9.653858317520557,"user_id": "62384130f40b6303928269b4"},{"items": {"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": -0.4509803921568629,"user_id": "6971ec005734ba047b695efd"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1},"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 30,"total_variation": -0.346141682479443,"user_id": "6971ec005734ba047b695efd"},{"items": {"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 9.549019607843137,"user_id": "69072faf5119eb00073fa5df"},{"items": {"Manifold Bond": {"rank": 0,"price": 25,"quantity": 1},"Momentous Bond": {"rank": null,"price": 25,"quantity": 1}},"total_price": 50,"total_variation": 19.65385831752056,"user_id": "69072faf5119eb00073fa5df"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "689813e31a935b00491d202c"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1},"Momentous Bond": {"rank": null,"price": 16,"quantity": 1}},"total_price": 31,"total_variation": 0.653858317520557,"user_id": "689813e31a935b00491d202c"},{"items": {"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": -0.4509803921568629,"user_id": "691c11e20d7ce700076c1205"},{"items": {"Momentous Bond": {"rank": null,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 4.549019607843137,"user_id": "61d0d64d62c513102372844a"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1},"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 29,"total_variation": -1.346141682479443,"user_id": "691d6fb00853c6000a4bd4f0"},{"items": {"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": -0.4509803921568629,"user_id": "689391a01a9e8f0009083bde"},{"items": {"Momentous Bond": {"rank": null,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": -0.4509803921568629,"user_id": "5cd9103daa7290148b4a7929"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "5e3d75509015da00ce3b5ccd"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "6804a0db2dcd9900082f4ee6"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "68a31c46c2414c005b8abcd3"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "66c5085c5ca3222617b40220"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1}},"total_price": 14,"total_variation": -0.8951612903225801,"user_id": "692a7b327692ac0007f32f8b"},{"items": {"Manifold Bond": {"rank": 0,"price": 12,"quantity": 1}},"total_price": 12,"total_variation": -2.89516129032258,"user_id": "5715c8b8d3ffb629a08226cb"},{"items": {"Manifold Bond": {"rank": 0,"price": 12,"quantity": 1}},"total_price": 12,"total_variation": -2.89516129032258,"user_id": "653a887279157e013ffb60aa"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 5.10483870967742,"user_id": "5820f1240f313964c470d8fb"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1}},"total_price": 14,"total_variation": -0.8951612903225801,"user_id": "6911b66dc4dcef000a9f8954"},{"items": {"Manifold Bond": {"rank": 0,"price": 18,"quantity": 1}},"total_price": 18,"total_variation": 3.10483870967742,"user_id": "6703dc71ff39830079c0ecf2"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "6064646b1a02f00108cea76f"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1}},"total_price": 14,"total_variation": -0.8951612903225801,"user_id": "691b0e300d7ce700075a29e8"},{"items": {"Manifold Bond": {"rank": 0,"price": 18,"quantity": 1}},"total_price": 18,"total_variation": 3.10483870967742,"user_id": "6943ab8e40fdb60031dc0ad7"},{"items": {"Manifold Bond": {"rank": 0,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 10.10483870967742,"user_id": "5f3b2b452ee60d00a308fa7a"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "658c93995d2df0313e69a886"},{"items": {"Manifold Bond": {"rank": 0,"price": 25,"quantity": 1}},"total_price": 25,"total_variation": 10.10483870967742,"user_id": "69250facd3b60400078b5b91"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "69638293635d450009ab70d1"},{"items": {"Manifold Bond": {"rank": 0,"price": 13,"quantity": 1}},"total_price": 13,"total_variation": -1.89516129032258,"user_id": "6964b8f06d567d00087dcb45"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "68260c39f5ba0a03b91c98bc"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1}},"total_price": 14,"total_variation": -0.8951612903225801,"user_id": "6946c6b4d65c7b006764b46c"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 5.10483870967742,"user_id": "690b85005119eb000adf8caf"},{"items": {"Manifold Bond": {"rank": 0,"price": 19,"quantity": 1}},"total_price": 19,"total_variation": 4.10483870967742,"user_id": "69306c317692ac007fdd474b"},{"items": {"Manifold Bond": {"rank": 0,"price": 13,"quantity": 1}},"total_price": 13,"total_variation": -1.89516129032258,"user_id": "6839c22fa8f576007fd29383"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 5.10483870967742,"user_id": "68da9e6ca7e05d00070bdf53"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 5.10483870967742,"user_id": "669359f70f86de07478f6d90"},{"items": {"Manifold Bond": {"rank": 0,"price": 19,"quantity": 1}},"total_price": 19,"total_variation": 4.10483870967742,"user_id": "693d27483df1c3001f3ad27c"},{"items": {"Manifold Bond": {"rank": 0,"price": 20,"quantity": 1}},"total_price": 20,"total_variation": 5.10483870967742,"user_id": "5acde09949ef0013addc1ba2"},{"items": {"Manifold Bond": {"rank": 0,"price": 15,"quantity": 1}},"total_price": 15,"total_variation": 0.10483870967741993,"user_id": "6926d22d7692ac00a3ae22a5"},{"items": {"Manifold Bond": {"rank": 0,"price": 18,"quantity": 1}},"total_price": 18,"total_variation": 3.10483870967742,"user_id": "5ea6f502aad77700e1a21f4e"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1}},"total_price": 14,"total_variation": -0.8951612903225801,"user_id": "693be3dbac798b000892cfaf"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1}},"total_price": 14,"total_variation": -0.8951612903225801,"user_id": "693bae30311deb00082dd1ad"},{"items": {"Manifold Bond": {"rank": 0,"price": 14,"quantity": 1}},"total_price": 14,"total_variation": -0.8951612903225801,"user_id": "694b853640fdb600a9ef3b18"},{"items": {"Manifold Bond": {"rank": 0,"price": 12,"quantity": 1}},"total_price": 12,"total_variation": -2.89516129032258,"user_id": "6929e0e0b44a1b0008164304"}],"user_map": {"5715c8b8d3ffb629a08226cb": {"user_in_game_name": "Thambletick","user_reputation": 43,"user_slug": "thambletick","url": "https://warframe.market/profile/thambletick","user_status": "ingame"},"5820f1240f313964c470d8fb": {"user_in_game_name": "Puckzz","user_reputation": 3,"user_slug": "puckzz","url": "https://warframe.market/profile/puckzz","user_status": "ingame"},"583dc12dd3ffb612d3e65f53": {"user_in_game_name": "JushPrime","user_reputation": 7,"user_slug": "jushprime","url": "https://warframe.market/profile/jushprime","user_status": "ingame"},"590459dc0f313934c43f29e7": {"user_in_game_name": "Rayray1899","user_reputation": 13,"user_slug": "rayray1899","url": "https://warframe.market/profile/rayray1899","user_status": "ingame"},"595d46490f313944640ebf56": {"user_in_game_name": "Cier.","user_reputation": 38,"user_slug": "cier","url": "https://warframe.market/profile/cier","user_status": "ingame"},"5a6a5296f629d7027485ee73": {"user_in_game_name": "derpguy6219","user_reputation": 1,"user_slug": "derpguy6219","url": "https://warframe.market/profile/derpguy6219","user_status": "ingame"},"5a862b9e0a0674075736ea39": {"user_in_game_name": "metal321","user_reputation": 4,"user_slug": "metal321","url": "https://warframe.market/profile/metal321","user_status": "ingame"},"5acde09949ef0013addc1ba2": {"user_in_game_name": "TheLale","user_reputation": 10,"user_slug": "thelale","url": "https://warframe.market/profile/thelale","user_status": "ingame"},"5c1a7c80ccdafb005ecec74d": {"user_in_game_name": "2LSON","user_reputation": 27,"user_slug": "2lson","url": "https://warframe.market/profile/2lson","user_status": "ingame"},"5ca097f6f8f1c502a2f21f53": {"user_in_game_name": "xiaoyandeliyou","user_reputation": 7,"user_slug": "xiaoyandeliyou","url": "https://warframe.market/profile/xiaoyandeliyou","user_status": "ingame"},"5cd9103daa7290148b4a7929": {"user_in_game_name": "Nerine_Radiata","user_reputation": 55,"user_slug": "nerine_radiata","url": "https://warframe.market/profile/nerine_radiata","user_status": "ingame"},"5d297dfc5c9cca00c6afdace": {"user_in_game_name": "Zz_Mode_zZ","user_reputation": 66,"user_slug": "zz-mode-zz","url": "https://warframe.market/profile/zz-mode-zz","user_status": "ingame"},"5d541cfbcf7a270014b98ba6": {"user_in_game_name": "Duck_yz","user_reputation": 22,"user_slug": "duck-yz","url": "https://warframe.market/profile/duck-yz","user_status": "ingame"},"5d63cc0035f88601f1565113": {"user_in_game_name": "Tio_Prime","user_reputation": 17,"user_slug": "tio-prime","url": "https://warframe.market/profile/tio-prime","user_status": "ingame"},"5e3d75509015da00ce3b5ccd": {"user_in_game_name": "RememberMeForever","user_reputation": 26,"user_slug": "remembermeforever","url": "https://warframe.market/profile/remembermeforever","user_status": "ingame"},"5e64c4f626753903b5fcaf0f": {"user_in_game_name": "Westvyilii.","user_reputation": 1668,"user_slug": "westvyilii","url": "https://warframe.market/profile/westvyilii","user_status": "ingame"},"5ea6f502aad77700e1a21f4e": {"user_in_game_name": "KonMing","user_reputation": 34,"user_slug": "konming","url": "https://warframe.market/profile/konming","user_status": "ingame"},"5f3b2b452ee60d00a308fa7a": {"user_in_game_name": "PRINCE","user_reputation": 126,"user_slug": "prince-8910","url": "https://warframe.market/profile/prince-8910","user_status": "ingame"},"5f769400824fa301dcb66fed": {"user_in_game_name": "AASWERF23324","user_reputation": 142,"user_slug": "aaswerf23324","url": "https://warframe.market/profile/aaswerf23324","user_status": "ingame"},"6064646b1a02f00108cea76f": {"user_in_game_name": "Solarsidoo","user_reputation": 34,"user_slug": "solarsidoo","url": "https://warframe.market/profile/solarsidoo","user_status": "ingame"},"61d0d64d62c513102372844a": {"user_in_game_name": "Hellokieren","user_reputation": 5,"user_slug": "hellokieren","url": "https://warframe.market/profile/hellokieren","user_status": "ingame"},"62384130f40b6303928269b4": {"user_in_game_name": "--KNOKKNOK--","user_reputation": 17,"user_slug": "knokknok","url": "https://warframe.market/profile/knokknok","user_status": "ingame"},"62af36b76dd0a008b89ceebc": {"user_in_game_name": "sonyc148","user_reputation": 74,"user_slug": "sonyc148","url": "https://warframe.market/profile/sonyc148","user_status": "ingame"},"63884fee3a8f8d09571bfad6": {"user_in_game_name": "Ainsoph004","user_reputation": 18,"user_slug": "ainsoph004","url": "https://warframe.market/profile/ainsoph004","user_status": "ingame"},"63c04103e239a20deedb59f4": {"user_in_game_name": "LIOKEXO","user_reputation": 3,"user_slug": "liokexo","url": "https://warframe.market/profile/liokexo","user_status": "ingame"},"640d7b0e357172014729dc7b": {"user_in_game_name": "Lsu8","user_reputation": 89,"user_slug": "lsu8","url": "https://warframe.market/profile/lsu8","user_status": "ingame"},"641b11f2816094044e6701f4": {"user_in_game_name": "Yaffy","user_reputation": 18,"user_slug": "yaffy","url": "https://warframe.market/profile/yaffy","user_status": "ingame"},"64256bc3816094079cdce83d": {"user_in_game_name": "MRJUN2","user_reputation": 24,"user_slug": "mrjun2","url": "https://warframe.market/profile/mrjun2","user_status": "ingame"},"646de24d3a1eb2104bbd68a3": {"user_in_game_name": "gerghPrime","user_reputation": 44,"user_slug": "gerghprime","url": "https://warframe.market/profile/gerghprime","user_status": "ingame"},"64d8e02c1dd0eb006b45c5e4": {"user_in_game_name": "lalalal233","user_reputation": 53,"user_slug": "lalalal233","url": "https://warframe.market/profile/lalalal233","user_status": "ingame"},"65035e20e075a0025f710513": {"user_in_game_name": "VENDOMINUS","user_reputation": 74,"user_slug": "vendominus","url": "https://warframe.market/profile/vendominus","user_status": "ingame"},"653953ea98b18f00bbafae56": {"user_in_game_name": "Ragez316","user_reputation": 322,"user_slug": "ragez316","url": "https://warframe.market/profile/ragez316","user_status": "ingame"},"653a887279157e013ffb60aa": {"user_in_game_name": "Jetfire2","user_reputation": 20,"user_slug": "jetfire2","url": "https://warframe.market/profile/jetfire2","user_status": "ingame"},"6570930c0549dc1e8b90cbad": {"user_in_game_name": "appleasb","user_reputation": 9,"user_slug": "appleasb","url": "https://warframe.market/profile/appleasb","user_status": "ingame"},"658317f52d2bbe2a19bf2805": {"user_in_game_name": "honokasaiko","user_reputation": 5,"user_slug": "honokasaiko","url": "https://warframe.market/profile/honokasaiko","user_status": "ingame"},"658c93995d2df0313e69a886": {"user_in_game_name": "GrolemPrime","user_reputation": 16,"user_slug": "grolemprime","url": "https://warframe.market/profile/grolemprime","user_status": "ingame"},"65a55acbe48ca602710219d7": {"user_in_game_name": "TinyShark-_-","user_reputation": 3,"user_slug": "tinyshark","url": "https://warframe.market/profile/tinyshark","user_status": "ingame"},"6613dc0f5ca3220295c6faad": {"user_in_game_name": "RomiSol","user_reputation": 2,"user_slug": "romisol","url": "https://warframe.market/profile/romisol","user_status": "ingame"},"667813e6bc707e03d085ca4d": {"user_in_game_name": "kaiserouo","user_reputation": 28,"user_slug": "kaiserouo","url": "https://warframe.market/profile/kaiserouo","user_status": "ingame"},"669359f70f86de07478f6d90": {"user_in_game_name": "ThunderFury08","user_reputation": 19,"user_slug": "thunderfury08","url": "https://warframe.market/profile/thunderfury08","user_status": "ingame"},"66b23ddd5ca32222935a8dbb": {"user_in_game_name": "Hjash","user_reputation": 18,"user_slug": "hjash","url": "https://warframe.market/profile/hjash","user_status": "ingame"},"66c5085c5ca3222617b40220": {"user_in_game_name": "Soul_Booster","user_reputation": 112,"user_slug": "soul-booster","url": "https://warframe.market/profile/soul-booster","user_status": "ingame"},"6703dc71ff39830079c0ecf2": {"user_in_game_name": "dogtrash","user_reputation": 18,"user_slug": "dogtrash","url": "https://warframe.market/profile/dogtrash","user_status": "ingame"},"6737fd69b69dfa0048c1692e": {"user_in_game_name": "Antonwx","user_reputation": 56,"user_slug": "antonwx","url": "https://warframe.market/profile/antonwx","user_status": "ingame"},"67b480f685e707000826261e": {"user_in_game_name": "BiubiubiuZ","user_reputation": 14,"user_slug": "biubiubiuz","url": "https://warframe.market/profile/biubiubiuz","user_status": "ingame"},"6804a0db2dcd9900082f4ee6": {"user_in_game_name": "lzkx","user_reputation": 12,"user_slug": "lzkx","url": "https://warframe.market/profile/lzkx","user_status": "ingame"},"68260c39f5ba0a03b91c98bc": {"user_in_game_name": "fafa0499","user_reputation": 1,"user_slug": "fafa0499","url": "https://warframe.market/profile/fafa0499","user_status": "ingame"},"6839c22fa8f576007fd29383": {"user_in_game_name": "biubiuo-o","user_reputation": 2,"user_slug": "biubiuo-o","url": "https://warframe.market/profile/biubiuo-o","user_status": "ingame"},"689391a01a9e8f0009083bde": {"user_in_game_name": "zWuj","user_reputation": 64,"user_slug": "zwuj","url": "https://warframe.market/profile/zwuj","user_status": "ingame"},"689813e31a935b00491d202c": {"user_in_game_name": "Augenstern141a","user_reputation": 16,"user_slug": "augenstern141a","url": "https://warframe.market/profile/augenstern141a","user_status": "ingame"},"68a31c46c2414c005b8abcd3": {"user_in_game_name": "Xiunain666","user_reputation": 21,"user_slug": "xiunain666","url": "https://warframe.market/profile/xiunain666","user_status": "ingame"},"68aca12b2d340f0009034063": {"user_in_game_name": "_Lindo","user_reputation": 4,"user_slug": "lindo","url": "https://warframe.market/profile/lindo","user_status": "ingame"},"68be66a6a537190009d783fa": {"user_in_game_name": "Vex_008","user_reputation": 2,"user_slug": "vex_008","url": "https://warframe.market/profile/vex_008","user_status": "ingame"},"68da9e6ca7e05d00070bdf53": {"user_in_game_name": "sui.ran","user_reputation": 3,"user_slug": "sui-ran","url": "https://warframe.market/profile/sui-ran","user_status": "ingame"},"68ecb6c7e520750091cceda9": {"user_in_game_name": "FRAMER9991","user_reputation": 4,"user_slug": "framer9991","url": "https://warframe.market/profile/framer9991","user_status": "ingame"},"68f3a548bcb10f001f78de99": {"user_in_game_name": "greatphilosopher","user_reputation": 0,"user_slug": "greatphilosopher","url": "https://warframe.market/profile/greatphilosopher","user_status": "ingame"},"69072faf5119eb00073fa5df": {"user_in_game_name": "Kaldrone","user_reputation": 4,"user_slug": "kaldrone","url": "https://warframe.market/profile/kaldrone","user_status": "ingame"},"690aeb5dc4dcef0007d1981e": {"user_in_game_name": "ShaB1DE","user_reputation": 14,"user_slug": "shab1de","url": "https://warframe.market/profile/shab1de","user_status": "ingame"},"690b85005119eb000adf8caf": {"user_in_game_name": "Discordous","user_reputation": 2,"user_slug": "discordous","url": "https://warframe.market/profile/discordous","user_status": "ingame"},"690c1751b06cb80008948749": {"user_in_game_name": "AzyueJ","user_reputation": 0,"user_slug": "azyuej","url": "https://warframe.market/profile/azyuej","user_status": "ingame"},"6911b66dc4dcef000a9f8954": {"user_in_game_name": "1Randolph1","user_reputation": 2,"user_slug": "1randolph1","url": "https://warframe.market/profile/1randolph1","user_status": "ingame"},"6915fe99a450720007ab5750": {"user_in_game_name": "Gabriella_007","user_reputation": 0,"user_slug": "gabriella_007","url": "https://warframe.market/profile/gabriella_007","user_status": "ingame"},"691b0e300d7ce700075a29e8": {"user_in_game_name": "FatePointer","user_reputation": 3,"user_slug": "fatepointer","url": "https://warframe.market/profile/fatepointer","user_status": "ingame"},"691c11e20d7ce700076c1205": {"user_in_game_name": "iBrez45","user_reputation": 0,"user_slug": "ibrez45","url": "https://warframe.market/profile/ibrez45","user_status": "ingame"},"691d6fb00853c6000a4bd4f0": {"user_in_game_name": "Canbeikemeng","user_reputation": 7,"user_slug": "canbeikemeng","url": "https://warframe.market/profile/canbeikemeng","user_status": "ingame"},"691eacba0ded1c0020e599b7": {"user_in_game_name": "AfterLongNight","user_reputation": 3,"user_slug": "afterlongnight","url": "https://warframe.market/profile/afterlongnight","user_status": "ingame"},"69250facd3b60400078b5b91": {"user_in_game_name": "ElysiaPhiLia_093","user_reputation": 13,"user_slug": "elysiaphilia_093","url": "https://warframe.market/profile/elysiaphilia_093","user_status": "ingame"},"6926d22d7692ac00a3ae22a5": {"user_in_game_name": "GerrrMa","user_reputation": 10,"user_slug": "gerrrma","url": "https://warframe.market/profile/gerrrma","user_status": "ingame"},"6929e0e0b44a1b0008164304": {"user_in_game_name": "EvoXD123","user_reputation": 5,"user_slug": "evoxd123","url": "https://warframe.market/profile/evoxd123","user_status": "ingame"},"692a7b327692ac0007f32f8b": {"user_in_game_name": "xujijie","user_reputation": 3,"user_slug": "xujijie","url": "https://warframe.market/profile/xujijie","user_status": "ingame"},"69306c317692ac007fdd474b": {"user_in_game_name": "GGGG13142512525","user_reputation": 2,"user_slug": "gggg13142512525","url": "https://warframe.market/profile/gggg13142512525","user_status": "ingame"},"693bae30311deb00082dd1ad": {"user_in_game_name": "tqing4","user_reputation": 2,"user_slug": "tqing4","url": "https://warframe.market/profile/tqing4","user_status": "ingame"},"693be3dbac798b000892cfaf": {"user_in_game_name": "chuancheng16","user_reputation": 1,"user_slug": "chuancheng16","url": "https://warframe.market/profile/chuancheng16","user_status": "ingame"},"693d27483df1c3001f3ad27c": {"user_in_game_name": "guyun5","user_reputation": 13,"user_slug": "guyun5","url": "https://warframe.market/profile/guyun5","user_status": "ingame"},"6943ab8e40fdb60031dc0ad7": {"user_in_game_name": "ShanshansDivineChosen","user_reputation": 2,"user_slug": "shanshansdivinechosen","url": "https://warframe.market/profile/shanshansdivinechosen","user_status": "ingame"},"6946c6b4d65c7b006764b46c": {"user_in_game_name": "MujicaMortis","user_reputation": 2,"user_slug": "mujicamortis","url": "https://warframe.market/profile/mujicamortis","user_status": "ingame"},"694b853640fdb600a9ef3b18": {"user_in_game_name": "yiqing-","user_reputation": 0,"user_slug": "yiqing","url": "https://warframe.market/profile/yiqing","user_status": "ingame"},"694c07c8d65c7b00b5809d46": {"user_in_game_name": "gamerdreamer","user_reputation": 1,"user_slug": "gamerdreamer","url": "https://warframe.market/profile/gamerdreamer","user_status": "ingame"},"69638293635d450009ab70d1": {"user_in_game_name": "jindianyuanzi","user_reputation": 4,"user_slug": "jindianyuanzi","url": "https://warframe.market/profile/jindianyuanzi","user_status": "ingame"},"6964b8f06d567d00087dcb45": {"user_in_game_name": "Ullukai","user_reputation": 0,"user_slug": "ullukai","url": "https://warframe.market/profile/ullukai","user_status": "ingame"},"6971ec005734ba047b695efd": {"user_in_game_name": "DY1991","user_reputation": 0,"user_slug": "dy1991","url": "https://warframe.market/profile/dy1991","user_status": "ingame"}}}`)

function makeTradeText(user, tradeOption) {
  /**
   * Sample:
   * /w -CNT-NekoCharm Hi! I want to buy: "Catalyzing Shields (rank 1)" for 18 platinum. (warframe.market)
   * /w oKaziii Hi! I want to buy: "Vauban Prime Blueprint" for 27 platinum. (warframe.market)
   */
  function _makeItemText(itemName, itemInfo) {
    /**
     * itemName: string
     * itemInfo: { price: number, quantity: number, rank: number | null  }
     */
    const fullItemName = `${itemName}${itemInfo.rank !== null ? ` (rank ${itemInfo.rank})` : ""}`;
    if (itemInfo.quantity == 1) {
      return `"${fullItemName}" for ${itemInfo.price} platinum`;
    } else {
      return `"${fullItemName}" x ${itemInfo.quantity} for ${itemInfo.price}x${itemInfo.quantity} = ${itemInfo.price * itemInfo.quantity} platinum`;
    }
  }
  const itemTexts = Object.keys(tradeOption.items).map((itemName) => {
    return _makeItemText(itemName, tradeOption.items[itemName]);
  });
  const totalText = Object.keys(tradeOption.items).length > 1 ? `, with a total of ${tradeOption.total_price} platinum` : "";

  const tradeText = `/w ${user.user_in_game_name} Hi! I want to buy: ${itemTexts.join(", ")}${totalText}. (warframe.market)`;
  return tradeText;
}

function VarText({ v }) {
  const textColor = v > 0 ? "text-red-400" : v == 0 ? "text-gray-400" : "text-green-400";
  const sign = v > 0 ? "+" : v == 0 ? "±" : "-";
  const vStr = Math.abs(v).toFixed(2);
  
  return (<>
    <span className={`${textColor}`}>({sign}{vStr})</span>
  </>);
}

function BestTradeTableHeader() {
  return (
    <tr>
      <th className="border border-gray-600 px-4 py-2 bg-[#456882] w-1/6">User In-Game Name</th>
      <th className="border border-gray-600 px-4 py-2 bg-[#456882] w-1/6">Total Price</th>
      <th className="border border-gray-600 px-4 py-2 bg-[#456882]">Items</th>
      <th className="border border-gray-600 px-4 py-2 bg-[#456882] w-1/6"></th>
    </tr>
  );
}

function BestTradeTableOptionRow({ user, tradeOption, priceOracle }) {
  const [showCopyCommand, setShowCopyCommand] = useState(false);
  const inputRef = useRef(null);

  // technically a hack? this works, but idk why tbh
  const handleCopyClick = () => {
    setShowCopyCommand(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  };

  const rankText = (item_name) => (tradeOption.items[item_name].rank !== null ? (<span className="text-gray-400"> (rank {tradeOption.items[item_name].rank})</span>) : null);

  return (
    <tr>
      {
        !showCopyCommand ? (<>
          <td className="border border-gray-600 px-4 py-2">
            <a className="font-bold underline underline-offset-2" href={user.url} target="_blank" rel="noopener noreferrer">{user.user_in_game_name}</a>
          </td>
          <td className="border border-gray-600 px-4 py-2">{tradeOption.total_price}p <VarText v={tradeOption.total_variation} /></td>
          <td className="border border-gray-600 px-4 py-2">
          {Object.keys(tradeOption.items).map((item_name, index) => (
            <div key={index}>
            <b>{item_name}</b>{rankText(item_name)}: {tradeOption.items[item_name].price}p <VarText v={tradeOption.items[item_name].price - priceOracle[item_name]} /> x {tradeOption.items[item_name].quantity}
            </div>
            ))}
            </td>
          <td>
            <button className="w-20 px-2 py-1 bg-blue-900 hover:bg-blue-700 text-white rounded border border-blue-300" onClick={handleCopyClick}>Copy</button>
          </td>
        </>) : null
      }
      {
        showCopyCommand ? (<>
          <td colSpan="3" className="border border-gray-600 px-4 py-2">
            <div className="flex">
              <p>{Object.keys(tradeOption.items).map((item_name, index) => (<br key={index} />))}</p>
              <input ref={inputRef} readOnly className="border rounded border-black px-1 bg-gray-900 w-full font-sans" type="text" value={makeTradeText(user, tradeOption)} />
            </div>
          </td>
          <td>
            <button className="w-20 px-2 py-1 bg-red-900 hover:bg-red-700 text-white rounded border border-red-300" onClick={() => setShowCopyCommand(false)}>Close</button>
          </td>
        </>) : null
      }
    </tr>
  );
}

function OptionToggleButton({ label, isSelected, onClick }) {
  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";
  return (
    <button 
      className={`mr-2 px-2 py-1 border rounded ${isSelected ? cnSelected : cnUnselected}`}
      onClick={onClick}>
        {label}
    </button>
  );
}

function FilterOptionSelection({ filterOption, setFilterOption }) {
  /**
   * supports:
   * {
   *    moreThanOneItem: bool,
   *    onlyNegativeVariation: bool,
   * }
   */
  return (<>
    <div className="flex font-mono my-1">
      <p className="mr-2 py-1 text-white text-lg">Filter: </p>

      <OptionToggleButton
        label="Only item count > 1"
        isSelected={filterOption.moreThanOneItem}
        onClick={() => setFilterOption((prev) => ({ ...prev, moreThanOneItem: !prev.moreThanOneItem }))}
      />

      <OptionToggleButton
        label="Only negative variation"
        isSelected={filterOption.onlyNegativeVariation}
        onClick={() => setFilterOption((prev) => ({ ...prev, onlyNegativeVariation: !prev.onlyNegativeVariation }))}
      />
    </div>
  </>);
}

function filterTradeOptions(tradeOptions, filterOption) {
  /**
   * supports:
   * {
   *    moreThanOneItem: bool,
   *    onlyNegativeVariation: bool,
   * }
   */
  return tradeOptions.filter((tradeOption) => {
    if (filterOption.moreThanOneItem && Object.keys(tradeOption.items).length <= 1) {
      return false;
    }
    if (filterOption.onlyNegativeVariation && tradeOption.total_variation >= 0) {
      return false;
    }
    return true;
  });
}

function SortOptionSelection({ sortOption, setSortOption, isAsc, setIsAsc }) {
  /**
   * sortOption supports:
   * - total_price, total_variation, item_count
   */
  const cnUnselected = "bg-gray-900 hover:bg-gray-700 text-white border-gray-300";
  const cnSelected = "bg-gray-100 hover:bg-gray-300 text-black border-gray-300";

  const selectedHandleClick = (option) => {
    if (sortOption === option) {
      if (isAsc) {
        setIsAsc(false);
      }
      else if (!isAsc) {
        setSortOption(null);
      }
    } else {
      setSortOption(option);
      setIsAsc(true);
    }
  };

  return (<>
    <div className="flex font-mono my-1">
      <p className="mr-2 py-1 text-white text-lg">Sort by: </p>

      <OptionToggleButton
        label={`Total Price${sortOption === 'total_price' ? (isAsc ? ' ▲' : ' ▼') : ""}`}
        isSelected={sortOption === 'total_price'}
        onClick={() => selectedHandleClick('total_price')}
      />
      <OptionToggleButton
        label={`Total Variation${sortOption === 'total_variation' ? (isAsc ? ' ▲' : ' ▼') : ""}`}
        isSelected={sortOption === 'total_variation'}
        onClick={() => selectedHandleClick('total_variation')}
      />
      <OptionToggleButton
        label={`Item Count${sortOption === 'item_count' ? (isAsc ? ' ▲' : ' ▼') : ""}`}
        isSelected={sortOption === 'item_count'}
        onClick={() => selectedHandleClick('item_count')}
      />
    </div>
  </>);
}

function sortTradeOptions(tradeOptions, sortOption, isAsc) {
  /**
   * sortOption supports:
   * - total_price, total_variation, item_count
   */
  if (sortOption === null) {
    return tradeOptions;
  }

  const m = isAsc ? 1 : -1;
  const sortFn = {
    'total_price': (a, b) => m * (a.total_price - b.total_price),
    'total_variation': (a, b) => m * (a.total_variation - b.total_variation),
    'item_count': (a, b) => m * (Object.keys(a.items).length - Object.keys(b.items).length),
  }
  return tradeOptions.sort(sortFn[sortOption] || (() => 0));
}

export default function UserBestTradeTable({ userMap, tradeOptions, priceOracle }) {
  /*
      orderData: {item_name: list[Order]}, Order is wfm.Orders.Order turned into json object
      priceOracle: {item_name: int}
  */
  const [sortOption, setSortOption] = useState('total_variation');
  const [isAsc, setIsAsc] = useState(true);
  const [filterOption, setFilterOption] = useState({
    moreThanOneItem: false,
    onlyNegativeVariation: false,
  });

  // userMap = DATA['user_map'];
  // tradeOptions = DATA['trade_options'];
  // priceOracle = DATA['price_oracle'];

  if (userMap === null || tradeOptions === null || priceOracle === null || 
      userMap === undefined || tradeOptions === undefined || priceOracle === undefined) {
    return null;
  }

  const sortedTradeOptions = sortTradeOptions(filterTradeOptions([...tradeOptions], filterOption), sortOption, isAsc);

  // simply display data
  return (<>
    <div className="py-1">
      <FilterOptionSelection filterOption={filterOption} setFilterOption={setFilterOption} />
      <SortOptionSelection sortOption={sortOption} setSortOption={setSortOption} isAsc={isAsc} setIsAsc={setIsAsc} />
      <table className="table-fixed border-collapse border border-gray-600 text-l text-white font-mono w-full">
        <thead>
          <BestTradeTableHeader />
        </thead>
        <tbody>
          {
            sortedTradeOptions.map((tradeOption, index) => (
              <BestTradeTableOptionRow key={index} user={userMap[tradeOption.user_id]} tradeOption={tradeOption} priceOracle={priceOracle} />
            ))
          }
          {/* <BestTradeTableOptionRow user={userMap[tradeOptions[0].user_id]} tradeOption={tradeOptions[0]} priceOracle={priceOracle} /> */}
        </tbody>
      </table>
    </div>
  </>);
}