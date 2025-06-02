// Work Buddy Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Work Buddy Popup 로드됨! 🚀');
  
  // DOM 요소들
  const currentActivityEl = document.getElementById('currentActivity');
  const sessionTimeEl = document.getElementById('sessionTime');
  const dailyStatsListEl = document.getElementById('dailyStatsList');
  const totalTimeEl = document.getElementById('totalTime');
  const motivationalMessageEl = document.getElementById('motivationalMessage');
  const pauseBtnEl = document.getElementById('pauseBtn');
  const testNotificationBtnEl = document.getElementById('testNotificationBtn');
  const resetBtnEl = document.getElementById('resetBtn');

  // 데이터 로드 및 UI 업데이트
  await loadAndDisplayData();
  
  // 1초마다 시간 관련 UI만 업데이트 (메시지는 제외)
  setInterval(async () => {
    await updateTimeRelatedData();
  }, 1000);
  
  // 격려 메시지는 30초마다만 업데이트
  setInterval(() => {
    updateMotivationalMessage();
  }, 30000); // 30초

  // 버튼 이벤트 리스너
  pauseBtnEl.addEventListener('click', handlePause);
  testNotificationBtnEl.addEventListener('click', handleTestNotification);
  resetBtnEl.addEventListener('click', handleReset);

  // 초기 상태 로드
  await updatePauseButtonState();

  async function loadAndDisplayData() {
    await updateTimeRelatedData();
    updateMotivationalMessage(); // 처음 로드 시에만 메시지 설정
  }

  async function updateTimeRelatedData() {
    try {
      // 현재 활성 탭 정보 가져오기
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await updateCurrentActivity(activeTab);

      // 일일 사용 통계 가져오기
      const result = await chrome.storage.local.get(['dailyUsage']);
      const dailyUsage = result.dailyUsage || {};
      
      updateDailyStats(dailyUsage);
      // 격려 메시지는 여기서 업데이트하지 않음
    } catch (error) {
      console.error('시간 데이터 로드 오류:', error);
    }
  }

  async function updateCurrentActivity(tab) {
    if (!tab || !tab.url) {
      currentActivityEl.textContent = '대기 중...';
      sessionTimeEl.textContent = '0분';
      return;
    }

    const siteInfo = extractSiteInfo(tab);
    currentActivityEl.textContent = `${siteInfo.name} (${siteInfo.category})`;
    
    // 현재 세션 시간 계산
    try {
      const result = await chrome.storage.local.get(['currentSession']);
      const currentSession = result.currentSession;
      
      if (currentSession && currentSession.startTime) {
        const now = Date.now();
        const sessionDuration = now - currentSession.startTime;
        const sessionMinutes = Math.floor(sessionDuration / (1000 * 60));
        
        if (sessionMinutes > 0) {
          sessionTimeEl.textContent = `${sessionMinutes}분`;
        } else {
          sessionTimeEl.textContent = '1분 미만';
        }
      } else {
        sessionTimeEl.textContent = '시작 중...';
      }
    } catch (error) {
      sessionTimeEl.textContent = '진행 중...';
    }
  }

  function updateDailyStats(dailyUsage) {
    const today = new Date().toDateString();
    const todayUsage = dailyUsage[today] || {};
    
    // 통계 리스트 초기화
    dailyStatsListEl.innerHTML = '';
    
    let totalMinutes = 0;
    
    // 각 사이트별 통계 표시
    Object.entries(todayUsage).forEach(([siteName, stats]) => {
      const minutes = Math.floor(stats.totalTime / (1000 * 60));
      totalMinutes += minutes;
      
      const statItem = createStatItem(siteName, stats.category, minutes);
      dailyStatsListEl.appendChild(statItem);
    });
    
    // 총 시간 업데이트
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    if (hours > 0) {
      totalTimeEl.textContent = `${hours}시간 ${remainingMinutes}분`;
    } else {
      totalTimeEl.textContent = `${remainingMinutes}분`;
    }
    
    // 통계가 없으면 안내 메시지 표시
    if (Object.keys(todayUsage).length === 0) {
      dailyStatsListEl.innerHTML = '<p style="text-align: center; color: #718096; font-size: 14px;">아직 기록이 없어요. 작업을 시작해보세요! 📚</p>';
    }
  }

  function createStatItem(siteName, category, minutes) {
    const div = document.createElement('div');
    div.className = `stat-item ${getCategoryClass(category)}`;
    
    div.innerHTML = `
      <span class="stat-name">${siteName}</span>
      <span class="stat-time">${minutes}분</span>
    `;
    
    return div;
  }

  function getCategoryClass(category) {
    const categoryMap = {
      '개발': 'dev',
      '학습': 'learning', 
      '디자인': 'design',
      '작업': 'work'
    };
    
    return categoryMap[category] || 'other';
  }

  function updateMotivationalMessage() {
    const messages = [
      "오늘도 멋진 하루 보내고 계시네요! ✨",
      "꾸준함이 실력이 됩니다! 화이팅! 💪",
      "지금 이 순간이 성장하는 시간이에요! 🚀",
      "하나씩 차근차근, 잘하고 계세요! 👏",
      "당신의 노력이 빛나고 있어요! ⭐",
      "집중하는 모습이 정말 멋져요! 🔥",
      "오늘의 성취를 만들어가는 중이네요! 🎯",
      "프로다운 집중력이에요! 👨‍💻"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    motivationalMessageEl.textContent = randomMessage;
  }

  function extractSiteInfo(tab) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const title = tab.title || '';

    const categories = {
      'localhost': { category: '개발', name: '로컬 개발' },
      'github.com': { category: '개발', name: 'GitHub' },
      'stackoverflow.com': { category: '학습', name: 'Stack Overflow' },
      'youtube.com': { category: '학습', name: 'YouTube' },
      'vscode.dev': { category: '개발', name: 'VS Code Web' },
      'codepen.io': { category: '개발', name: 'CodePen' },
      'notion.so': { category: '작업', name: 'Notion' },
      'figma.com': { category: '디자인', name: 'Figma' },
      'docs.google.com': { category: '작업', name: 'Google Docs' }
    };

    const siteInfo = categories[domain] || { 
      category: '기타', 
      name: domain.replace('www.', '') 
    };

    return {
      ...siteInfo,
      url: tab.url,
      title: title
    };
  }

  async function handlePause() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_PAUSE' });
      await updatePauseButtonState();
      
      if (response.isPaused) {
        showTemporaryMessage('휴식 시간입니다! 차나 커피 드세요 🍵');
      } else {
        showTemporaryMessage('다시 시작! 오늘도 화이팅! 🚀');
      }
    } catch (error) {
      console.error('일시정지 토글 오류:', error);
      alert('일시정지 기능에 오류가 발생했습니다.');
    }
  }

  async function handleTestNotification() {
    try {
      await chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' });
      showTemporaryMessage('테스트 알림을 보냈습니다! 🔔');
    } catch (error) {
      console.error('테스트 알림 오류:', error);
      alert('알림 전송에 실패했습니다.');
    }
  }

  async function updatePauseButtonState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (response.isPaused) {
        pauseBtnEl.textContent = '재시작';
        pauseBtnEl.className = 'btn btn-primary';
      } else {
        pauseBtnEl.textContent = '일시정지';
        pauseBtnEl.className = 'btn btn-secondary';
      }
    } catch (error) {
      console.error('상태 로드 오류:', error);
    }
  }

  function showTemporaryMessage(message) {
    const originalMessage = motivationalMessageEl.textContent;
    motivationalMessageEl.textContent = message;
    motivationalMessageEl.style.fontWeight = 'bold';
    
    setTimeout(() => {
      motivationalMessageEl.textContent = originalMessage;
      motivationalMessageEl.style.fontWeight = 'normal';
    }, 3000); // 3초 후 원래 메시지로 복귀
  }

  async function handleReset() {
    const confirmed = confirm('오늘의 모든 기록을 초기화하시겠습니까?');
    if (confirmed) {
      try {
        const today = new Date().toDateString();
        const result = await chrome.storage.local.get(['dailyUsage']);
        const dailyUsage = result.dailyUsage || {};
        
        delete dailyUsage[today];
        
        await chrome.storage.local.set({ dailyUsage });
        
        // UI 즉시 업데이트
        await loadAndDisplayData();
        
        alert('기록이 초기화되었습니다! ✨');
      } catch (error) {
        console.error('초기화 오류:', error);
        alert('초기화 중 오류가 발생했습니다.');
      }
    }
  }
});