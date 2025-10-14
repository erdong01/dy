// components/AdScript.tsx
"use client";

import { useEffect } from 'react';

const AdScript = () => {
  useEffect(() => {
    // 创建一个唯一的 ID，以避免重复添加脚本
    const scriptId = 'dynamic-ad-script-holder';
    if (document.getElementById(scriptId)) {
      // 如果脚本的容器已经存在，则不重复执行
      return;
    }

    // 动态加载并执行位于 /public/ad-script.js 的脚本
    const loadAndRunScript = async () => {
      try {
        const response = await fetch('/ad-script.js'); // 从 public 目录获取文件
        if (!response.ok) {
          throw new Error(`无法加载脚本: ${response.status}`);
        }
        const scriptContent = await response.text();

        // --- 核心逻辑：完美复刻原始代码的机制 ---

        // 1. 创建一个隐藏的 div 来容纳主要脚本代码，就像原始代码那样。
        const holderDiv = document.createElement('div');
        holderDiv.id = scriptId; // 添加唯一ID
        holderDiv.style.display = 'none';
        holderDiv.style.visibility = 'hidden';
        holderDiv.innerText = scriptContent; // 将获取到的代码放入div
        document.body.appendChild(holderDiv);

        // 2. 创建并执行第二个脚本，它会读取并运行第一个脚本的内容。
        const executorScript = document.createElement('script');
        // 下面这行代码是原始HTML中第二个<script>标签的精确内容
        executorScript.innerHTML = `(function(){var t = document.getElementById('${scriptId}').innerText; if(t) { new Function(t)(); } })();`;
        document.body.appendChild(executorScript);

      } catch (error) {
        console.error("加载或执行广告脚本时出错:", error);
      }
    };

    loadAndRunScript();

  }, []); // 空依赖数组 [] 确保此 effect 仅在组件挂载后运行一次。

  // 此组件本身不渲染任何内容
  return null;
};

export default AdScript;