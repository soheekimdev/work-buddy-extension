// Content Script - 웹페이지에 주입되는 스크립트
// 현재는 기본적인 페이지 정보만 수집합니다.

console.log('Work Buddy Content Script 로드됨 🚀');

// 페이지가 로드되었을 때의 정보를 백그라운드에 전달
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', reportPageInfo);
} else {
  reportPageInfo();
}

function reportPageInfo() {
  const pageInfo = {
    title: document.title,
    url: window.location.href,
    timestamp: Date.now()
  };
  
  // 백그라운드 스크립트에 페이지 정보 전달
  chrome.runtime.sendMessage({
    type: 'PAGE_INFO',
    data: pageInfo
  }).catch(() => {
    // 에러는 무시 (확장 프로그램이 비활성화된 경우)
  });
}