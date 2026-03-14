document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. Supabase 연결 초기화 (데이터베이스 설정)
    // ==========================================
    const { createClient } = window.supabase;
    const supabaseUrl = 'https://qcwvxkzjuecmucucjlam.supabase.co';
    const supabaseKey = 'sb_publishable_GbwveThbwT0Jsk0yK7cohg_PyyinFFy';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ==========================================
    // 2. DOM 요소 연결
    // ==========================================
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const emptyState = document.getElementById('empty-state');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    let todos = []; // 화면에 보이는 할 일 데이터 배열

    // ==========================================
    // 3. 앱 시작 시 데이터 불러오기
    // ==========================================
    loadTodos();

    // 입력 폼 제출 이벤트
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        
        if (text) {
            addTodo(text);
            todoInput.value = '';
        }
    });

    // ==========================================
    // 4. Supabase 핵심 기능 (불러오기/추가/수정/삭제)
    // ==========================================

    // [불러오기] Supabase에서 할 일 목록 가져오기
    async function loadTodos() {
        // 'todos' 테이블에서 전체 데이터를 가져와서 무작위 순서 방지를 위해 id순 정렬
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .order('id', { ascending: true }); 

        if (error) {
            console.error('데이터베이스 불러오기 에러:', error);
            alert('인터넷에 연결되지 않았거나 데이터베이스 표 이름이 다릅니다.');
            return;
        }

        if (data) {
            // DB에서 가져온 표 데이터를 통쨰로 화면에 맞게 변환
            todos = data.map(item => ({
                id: item.id.toString(),
                text: item.text || item.title || '내용 없음', // text 또는 title 컬럼 반영
                completed: item.complete // boolean 형 데이터
            }));
            
            // 가져온 데이터 화면에 렌더링
            todos.forEach(todo => renderTodo(todo));
            updateUI();
        }
    }

    // [추가] 할 일을 DB에 저장하기
    async function addTodo(text) {
        // text 필드에 입력한 내용, complete 필드는 시작점이므로 false 지정 저장
        const { data, error } = await supabase
            .from('todos')
            .insert([{ text: text, complete: false }])
            .select();
            
        if (error) {
            console.error('추가 에러:', error);
            alert('데이터 저장 실패! (Supabase에 "text" 열을 만들었는지 다시 확인해주세요)');
            return;
        }

        if (data && data.length > 0) {
            const dbItem = data[0];
            const newTodo = {
                id: dbItem.id.toString(),
                text: dbItem.text || dbItem.title,
                completed: dbItem.complete
            };
            
            todos.push(newTodo);
            renderTodo(newTodo);
            updateUI();
        }
    }

    // [수정] 할 일의 완료(체크) 상태 토글 업데이트
    async function toggleTodo(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        const newCompletedState = !todo.completed;

        // 화면보다 먼저 DB 데이터를 업데이트
        const { error } = await supabase
            .from('todos')
            .update({ complete: newCompletedState })
            .eq('id', id);

        if (error) {
            console.error('업데이트 에러:', error);
            alert('체크 상태를 DB에 저장하지 못했습니다.');
            return;
        }

        // DB 업데이트가 성공하면 화면도 변경 적용
        todo.completed = newCompletedState;
        const itemElement = document.getElementById(`todo-${id}`);
        if (todo.completed) {
            itemElement.classList.add('completed');
        } else {
            itemElement.classList.remove('completed');
        }
        
        updateUI();
        checkAllCompleted();
    }

    // [삭제] 할 일 버튼 삭제 실행
    async function deleteTodo(id) {
        const itemElement = document.getElementById(`todo-${id}`);
        itemElement.style.opacity = '0';
        itemElement.style.transform = 'translateY(-10px)';
        
        // Supabase DB에서 해당 ID의 줄을 완전히 삭제
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('삭제 에러:', error);
            itemElement.style.opacity = '1';
            itemElement.style.transform = 'translateY(0)';
            return;
        }

        // DB 삭제가 성공하면 0.3초 뒤에 화면에서도 제거
        setTimeout(() => {
            todos = todos.filter(t => t.id !== id);
            itemElement.remove();
            updateUI();
        }, 300);
    }

    // ==========================================
    // 5. 시각적 UI 관련 함수 (기존 코드 동일)
    // ==========================================

    function renderTodo(todo) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.id = `todo-${todo.id}`;
        
        li.innerHTML = `
            <div class="checkbox" role="button" aria-label="완료 체크">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <span class="todo-text">${escapeHTML(todo.text)}</span>
            <button class="delete-btn" aria-label="삭제">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;

        li.querySelector('.checkbox').addEventListener('click', () => toggleTodo(todo.id));
        li.querySelector('.todo-text').addEventListener('click', () => toggleTodo(todo.id));
        li.querySelector('.delete-btn').addEventListener('click', () => deleteTodo(todo.id));

        todoList.appendChild(li);
    }

    function updateUI() {
        if (todos.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }

        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `완료율: ${percentage}%`;
        
        if (percentage === 100 && total > 0) {
            progressFill.style.background = 'var(--success)';
            progressText.style.color = 'var(--success)';
        } else {
            progressFill.style.background = 'linear-gradient(to right, #6366f1, #a855f7)';
            progressText.style.color = 'var(--text-muted)';
        }
    }

    function checkAllCompleted() {
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        if (total > 0 && total === completed) {
            triggerConfetti();
        }
    }

    function triggerConfetti() {
        if (typeof confetti !== 'function') return;
        const duration = 4000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 100 };

        function randomInRange(min, max) { return Math.random() * (max - min) + min; }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 100 * (timeLeft / duration);
            
            confetti(Object.assign({}, defaults, { 
                particleCount, 
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#0a84ff', '#32d74b', '#ff453a', '#ffd60a', '#ffffff']
            }));
            confetti(Object.assign({}, defaults, { 
                particleCount, 
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#0a84ff', '#32d74b', '#ff453a', '#ffd60a', '#ffffff']
            }));
        }, 200);

        // 정중앙에서 터지는 거대 폭죽 추가
        setTimeout(() => {
            confetti({
                particleCount: 200,
                spread: 160,
                origin: { y: 0.6 },
                colors: ['#ffffff', '#0a84ff'],
                startVelocity: 60,
                zIndex: 100
            });
        }, 500);
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
            }[tag] || tag)
        );
    }
});
