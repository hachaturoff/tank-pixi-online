<script setup>
import Example from "./components/Example.vue";
import { ref, onMounted, onUnmounted } from "vue";

// Убедитесь, что ваш компонент Example.vue (где находится PIXI.js)
// принимает props для ID комнаты и сокета.

import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

// --- РЕАКТИВНОЕ СОСТОЯНИЕ ---
const gameState = ref("home"); // 'home', 'waiting', 'found', 'loadingGame', 'inGame'
const matchStatus = ref("Нажмите 'Найти соперника'");
const currentMatchId = ref(null);
const isSearching = ref(false);

const gameInfo = ref(null); // Для отладочного вывода данных игры
const winnerId = ref(null); // ID победителя последнего матча
const matchEndReason = ref(null); // Причина окончания матча

// --- ФУНКЦИИ УПРАВЛЕНИЯ ---

const findOpponent = () => {
  if (isSearching.value) {
    // ✅ ИСПРАВЛЕНО: Используем 'cancelMatchmaking' (как в бэкенде)
    socket.emit("cancelMatchmaking");
    isSearching.value = false;
    gameState.value = "home";
    matchStatus.value = "Поиск отменен.";
    winnerId.value = null; // Сброс победителя при новом поиске
  } else {
    socket.emit("findMatch");
    isSearching.value = true;
    gameState.value = "waiting";
    matchStatus.value = "Поиск соперника...";
    winnerId.value = null;
  }
};

const joinFoundMatch = (matchId) => {
  currentMatchId.value = matchId;
  gameState.value = "loadingGame";
  matchStatus.value = `Матч ${matchId} найден. Подключение...`;

  // 4. Отправляем запрос на присоединение к комнате
  socket.emit("joinMatch", matchId);
};

const leaveMatch = () => {
  // В многопользовательской игре достаточно полагаться на
  // встроенный обработчик disconnect (который вызовет событие "disconnect" на сервере)
  // чтобы сервер очистил комнату и объявил победителя.

  // ✅ Отключаем сокет (или обновляем состояние, чтобы удалить компонент игры)
  if (socket.connected) {
    socket.disconnect();
  }
  // Перезагружаем сокет, чтобы можно было снова подключиться
  setTimeout(() => {
    socket.connect();
    resetMatchState();
  }, 100);
};

const resetMatchState = () => {
  gameState.value = "home";
  isSearching.value = false;
  currentMatchId.value = null;
  matchStatus.value = 'Нажмите "Найти соперника"';
  gameInfo.value = null;
  // winnerId сохраняем, пока не начнется новый поиск
};

// --- ОБРАБОТЧИКИ SOCKET.IO ---

onMounted(() => {
  // Убедимся, что сокет подключен
  if (!socket.connected) {
    socket.connect();
  }

  // 1. Обновление статуса очереди
  socket.on("matchStatus", (data) => {
    if (data.status === "waiting" && gameState.value === "waiting") {
      matchStatus.value = `В очереди: ${
        data.queueSize || 0
      } игроков. Ожидание...`;
    } else if (data.status === "cancelled") {
      matchStatus.value = "Поиск отменен.";
    } else if (data.status === "already_queued") {
      matchStatus.value = "Вы уже в очереди.";
      gameState.value = "waiting";
    }
  });

  // 2. Матч найден!
  socket.on("matchFound", (data) => {
    
    gameState.value = "found";
    matchStatus.value = `Соперник найден! Комната ID: ${data.matchId}`;

    // Автоматически присоединяемся к комнате
    joinFoundMatch(data.matchId);
  });

  // 3. Начало игры
  socket.on("matchStart", (message) => {
    console.log("Матч начался:", message);
    gameState.value = "inGame";
    matchStatus.value = "Матч начался! В бой!";
  });

  // 4. Обновление состояния игры
  socket.on("gameState", (players) => {
    if (gameState.value === "inGame") {
      // В реальной игре эта функция будет обновлять спрайты PIXI
      gameInfo.value = players;
    }
  });

  // 5. Обработка смерти другого игрока
  socket.on("deathPlayer", (data) => {
    if (data.id === socket.id) {
      // Я умер
      console.log("Вы были уничтожены!");
      matchStatus.value = "Вы были уничтожены!";
      // Если вы хотите немедленно закончить игру, можно сделать resetMatchState();
    } else {
      console.log(`Противник ${data.id} был уничтожен.`);
    }
  });

  // 6. Конец матча (Я победил или проиграл)
  socket.on("matchEnd", (data) => {
    console.log(`Матч завершен. Победитель: ${data.winnerId}`);

    winnerId.value = data.winnerId;
    matchEndReason.value = data.reason;

    if (data.winnerId === socket.id) {
      matchStatus.value = `ПОБЕДА! ${data.reason ? "(Противник вышел)" : ""}`;
    } else {
      matchStatus.value = `ПОРАЖЕНИЕ. Победитель: ${data.winnerId}`;
    }

    resetMatchState(); // Сброс состояния, чтобы вернуться к поиску
  });

  // 7. Ошибки
  socket.on("matchError", (message) => {
    console.error("Ошибка матча:", message);
    resetMatchState();
    matchStatus.value = `Ошибка: ${message}`;
  });

  // 8. На случай потери соединения
  socket.on("disconnect", (reason) => {
    console.log(`Socket отключен: ${reason}`);
    if (gameState.value === "inGame" || gameState.value === "waiting") {
      matchStatus.value = `Соединение потеряно. ${reason}`;
      resetMatchState();
    }
  });
});
// console.log("gameState", gameState.value);

onUnmounted(() => {
  socket.off("matchStatus");
  socket.off("matchFound");
  socket.off("matchStart");
  socket.off("gameState");
  socket.off("deathPlayer");
  socket.off("matchEnd");
  socket.off("matchError");
  socket.off("disconnect");
});

</script>

<template>
  <div class="container">
    <header v-if="gameState === 'inGame'">
      <h1>Tanks Online</h1>
    </header>
    <main>

      <div v-if="gameState === 'home' || gameState === 'waiting'">
        <h2>{{ matchStatus }}</h2>

        <button
          @click="findOpponent"
          :disabled="gameState === 'found'"
          :class="{ searching: isSearching }"
        >
          {{ isSearching ? "Отменить поиск" : "Найти соперника" }}
        </button>

        <p v-if="winnerId"> 🏆 **Последний победитель:** {{ winnerId }}
          <span v-if="matchEndReason">({{ matchEndReason }})</span>
        </p>
        <p v-if="isSearching" class="loading-animation">...</p>
      </div>

      <div v-else-if="gameState === 'loadingGame' || gameState === 'inGame'" class="game-area">
        <h2>{{ gameState === 'loadingGame' ? matchStatus : `Матч ${currentMatchId}` }}</h2>
        <p v-if="gameState === 'loadingGame'">Пожалуйста, подождите, пока присоединится второй игрок...</p>
        <p v-if="gameState === 'loadingGame'">ID комнаты: {{ currentMatchId }}</p>
        
        <!-- Example монтируется один раз и сохраняется между loadingGame и inGame -->
        <Example :match-id="currentMatchId" :socket="socket" />
        
        <template v-if="gameState === 'inGame'">
          <p>*** ИГРА В ПРОЦЕССЕ: PIXI.JS CANVAS ***</p>
          <!-- <pre>{{ gameInfo }}</pre> -->
          <button @click="leaveMatch">Покинуть матч</button>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.container {
  text-align: center;
  padding: 20px;
}

.searching {
  background-color: #ff9800;
}

.loading-animation {
  font-size: 2em;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.5;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.5;
  }
}

.game-area {
  margin: 20px auto;
}

/* Стили для контейнера игры, если Example не использует их сам */
/* #pixi-game-container {
    margin: 20px auto;
    background: #444;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
} */

@media screen and (max-width: 650px) {
  .container {
      padding: 0;
  }    
}
</style>