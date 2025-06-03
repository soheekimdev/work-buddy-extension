// Work Buddy - Background Script
// 백그라운드에서 사용자의 활동을 추적하고 알림을 보냅니다.

class WorkBuddy {
  constructor() {
    this.currentSite = null;
    this.sessionStartTime = null;
    this.lastNotificationTime = 0;
    this.dailyUsage = {};
    this.isPaused = false; // 일시정지 상태
    this.motivationalMessages = [
      '집중력 대단해요! 계속 화이팅! 🔥',
      '지금 이 순간이 성장하는 시간이에요 ✨',
      '멋진 작업 중이시네요! 프로답습니다 👏',
      '꾸준함이 실력이 되고 있어요! 🚀',
      '지금 하고 계신 작업, 정말 의미있어 보여요! 💪',
    ];

    this.init();
  }

  init() {
    // 탭 변경 감지
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabChange(activeInfo);
    });

    // 탭 업데이트 감지 (새로고침, URL 변경)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        this.trackCurrentActivity(tab);
      }
    });

    // 30분마다 격려 메시지
    setInterval(() => {
      this.sendMotivationalMessage();
    }, 30 * 60 * 1000); // 30분

    // 1분마다 현재 세션 업데이트
    setInterval(() => {
      this.updateCurrentSession();
    }, 60 * 1000); // 1분

    // 메시지 수신 리스너 (팝업에서 명령 받기)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'TOGGLE_PAUSE') {
        this.togglePause();
        sendResponse({ isPaused: this.isPaused });
      } else if (request.type === 'TEST_NOTIFICATION') {
        this.sendMotivationalMessage();
        sendResponse({ success: true });
      } else if (request.type === 'GET_STATUS') {
        sendResponse({ isPaused: this.isPaused });
      } else if (request.type === 'RESET_SESSION') {
        this.resetSession();
        sendResponse({ success: true });
      }
    });

    console.log('Work Buddy가 시작되었습니다! 🚀');
  }

  async handleTabChange(activeInfo) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      this.trackCurrentActivity(tab);
    } catch (error) {
      console.log('탭 정보를 가져올 수 없습니다:', error);
    }
  }

  trackCurrentActivity(tab) {
    if (!tab.url || this.isPaused) return; // 일시정지 상태면 추적 안 함

    const site = this.extractSiteInfo(tab);
    const now = Date.now();

    // 이전 사이트 시간 기록
    if (this.currentSite && this.sessionStartTime) {
      const sessionDuration = now - this.sessionStartTime;
      this.updateDailyUsage(this.currentSite, sessionDuration);
    }

    // 새로운 사이트 시작
    this.currentSite = site;
    this.sessionStartTime = now;

    // 현재 세션 정보를 스토리지에 저장
    chrome.storage.local.set({
      currentSession: {
        site: site,
        startTime: now,
      },
    });

    console.log(`현재 작업: ${site.name} (${site.category})`);
  }

  extractSiteInfo(tab) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const title = tab.title || '';

    // 개발 관련 사이트 분류
    const categories = {
      localhost: { category: '개발', name: '로컬 개발' },
      'github.com': { category: '개발', name: 'GitHub' },
      'stackoverflow.com': { category: '학습', name: 'Stack Overflow' },
      'youtube.com': { category: '학습', name: 'YouTube' },
      'vscode.dev': { category: '개발', name: 'VS Code Web' },
      'codepen.io': { category: '개발', name: 'CodePen' },
      'notion.so': { category: '작업', name: 'Notion' },
      'figma.com': { category: '디자인', name: 'Figma' },
      'docs.google.com': { category: '작업', name: 'Google Docs' },
    };

    const siteInfo = categories[domain] || {
      category: '기타',
      name: domain.replace('www.', ''),
    };

    return {
      ...siteInfo,
      url: tab.url,
      title: title,
    };
  }

  updateDailyUsage(site, duration) {
    const today = new Date().toDateString();

    if (!this.dailyUsage[today]) {
      this.dailyUsage[today] = {};
    }

    if (!this.dailyUsage[today][site.name]) {
      this.dailyUsage[today][site.name] = {
        category: site.category,
        totalTime: 0,
        sessions: 0,
      };
    }

    this.dailyUsage[today][site.name].totalTime += duration;
    this.dailyUsage[today][site.name].sessions += 1;

    // 스토리지에 저장
    chrome.storage.local.set({ dailyUsage: this.dailyUsage });
  }

  async sendMotivationalMessage() {
    if (this.isPaused) return; // 일시정지 상태면 알림 안 보냄

    const now = Date.now();

    // 50분 이내에 이미 알림을 보냈다면 스킵 (30분에서 50분으로 변경)
    if (now - this.lastNotificationTime < 50 * 60 * 1000) {
      return;
    }

    if (!this.currentSite) return;

    const message = this.generateContextualMessage();

    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Work Buddy 💪',
        message: message,
      });

      this.lastNotificationTime = now;
      console.log('격려 메시지 발송:', message);
    } catch (error) {
      console.log('알림 발송 실패:', error);
    }
  }

  generateContextualMessage() {
    if (!this.currentSite) {
      return this.getRandomMessage();
    }

    const sessionTime = Date.now() - this.sessionStartTime;
    const sessionMinutes = Math.floor(sessionTime / (1000 * 60));

    // 사이트별 맞춤 메시지
    const contextualMessages = {
      개발: [
        `${this.currentSite.name}에서 ${sessionMinutes}분째 코딩 중! 개발자의 집중력 👨‍💻`,
        `코드 한 줄 한 줄이 성장이에요! 대단해요 🚀`,
        `디버깅도 실력! 차근차근 해결해나가는 모습 멋져요 🔧`,
      ],
      학습: [
        `${sessionMinutes}분째 학습 중! 새로운 지식을 쌓고 계시네요 📚`,
        `꾸준한 학습이 실력을 만들어요! 화이팅! ✨`,
        `궁금한 걸 찾아보는 모습, 진짜 개발자 같아요! 🔍`,
      ],
      디자인: [
        `${sessionMinutes}분째 디자인 작업! 창의력이 넘쳐나네요 🎨`,
        `디테일 하나하나 신경쓰는 모습 프로 같아요! 👏`,
        `사용자를 생각하며 디자인하는 마음이 멋져요 ✨`,
      ],
      작업: [
        `${sessionMinutes}분째 집중! 생산적인 시간을 보내고 계시네요 💼`,
        `꼼꼼하게 작업하시는 모습 정말 멋져요! 📝`,
        `체계적으로 일하시는구나! 프로페셔널해요 🎯`,
      ],
    };

    const categoryMessages = contextualMessages[this.currentSite.category];
    if (categoryMessages) {
      const randomIndex = Math.floor(Math.random() * categoryMessages.length);
      return categoryMessages[randomIndex];
    }

    return this.getRandomMessage();
  }

  getRandomMessage() {
    const randomIndex = Math.floor(Math.random() * this.motivationalMessages.length);
    return this.motivationalMessages[randomIndex];
  }

  // 현재 세션을 dailyUsage에 반영
  updateCurrentSession() {
    if (this.isPaused) return; // 일시정지 상태면 업데이트 안 함

    if (this.currentSite && this.sessionStartTime) {
      const now = Date.now();
      const sessionDuration = now - this.sessionStartTime;

      // 현재 세션도 dailyUsage에 포함
      this.updateDailyUsage(this.currentSite, sessionDuration);

      // 세션 시작 시간을 현재 시간으로 재설정 (중복 계산 방지)
      this.sessionStartTime = now;
    }
  }

  // 데이터 조회를 위한 메소드
  async getDailyUsage() {
    const result = await chrome.storage.local.get(['dailyUsage']);
    return result.dailyUsage || {};
  }

  // 세션 리셋 (초기화 버튼에서 호출)
  resetSession() {
    this.currentSite = null;
    this.sessionStartTime = null;
    this.isPaused = false;
    
    console.log('Work Buddy 세션이 리셋되었습니다! 🔄');
    
    return true;
  }

  // 일시정지/재시작 토글
  togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      // 일시정지 시 현재 세션 시간 저장
      this.updateCurrentSession();
      console.log('Work Buddy 일시정지됨 ⏸️');
    } else {
      // 재시작 시 새로운 세션 시작
      this.sessionStartTime = Date.now();
      console.log('Work Buddy 재시작됨 ▶️');
    }

    // 상태를 스토리지에 저장
    chrome.storage.local.set({ isPaused: this.isPaused });

    return this.isPaused;
  }

  // 현재 세션 정보 조회
  async getCurrentSession() {
    const result = await chrome.storage.local.get(['currentSession']);
    return result.currentSession || null;
  }
}

// Work Buddy 인스턴스 생성
const workBuddy = new WorkBuddy();
