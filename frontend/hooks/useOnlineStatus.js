import { useEffect, useRef, useCallback } from "react";
import { api } from "../api";

export const useOnlineStatus = (user, token) => {
  const heartbeatIntervalRef = useRef(null);
  const isPageVisibleRef = useRef(true);
  const isUserActiveRef = useRef(true);

  // Обновление статуса на сервере
  const updateStatus = useCallback(
    async (isOnline) => {
      if (!user?.user_id) return;
      try {
        await api.updateProfile(
          {
            userId: user.user_id,
            is_online: isOnline,
            last_seen: new Date().toISOString(),
          },
          token,
        );
        console.log(`🟢 Статус: ${isOnline ? "ONLINE" : "OFFLINE"}`);
      } catch (err) {
        console.error("Ошибка обновления статуса:", err);
      }
    },
    [user, token],
  );

  // Heartbeat – каждые 30 секунд подтверждаем, что пользователь онлайн
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      if (isUserActiveRef.current && isPageVisibleRef.current && user) {
        updateStatus(true);
      }
    }, 30000);
  }, [updateStatus, user]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Эффект для отслеживания видимости вкладки
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      isPageVisibleRef.current = isVisible;

      if (isVisible) {
        // Вкладка активна – онлайн
        updateStatus(true);
        startHeartbeat();
      } else {
        // Вкладка не активна – оффлайн через 5 секунд (на случай быстрого переключения)
        setTimeout(() => {
          if (!isPageVisibleRef.current) {
            updateStatus(false);
            stopHeartbeat();
          }
        }, 5000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateStatus, startHeartbeat, stopHeartbeat]);

  // Эффект для отслеживания активности пользователя (движение мыши, клики, печать)
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => {
      if (!isUserActiveRef.current) {
        isUserActiveRef.current = true;
        updateStatus(true);
        startHeartbeat();
      }
      // Сбрасываем таймер неактивности
      clearTimeout(window.inactivityTimeout);
      window.inactivityTimeout = setTimeout(() => {
        if (isUserActiveRef.current) {
          isUserActiveRef.current = false;
          updateStatus(false);
          stopHeartbeat();
        }
      }, 5 * 60 * 1000); // 5 минут бездействия → оффлайн
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    handleUserActivity(); // сразу устанавливаем онлайн

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearTimeout(window.inactivityTimeout);
    };
  }, [user, updateStatus, startHeartbeat, stopHeartbeat]);

  // При монтировании – онлайн, при размонтировании – оффлайн
  useEffect(() => {
    if (!user) return;

    updateStatus(true);
    startHeartbeat();

    return () => {
      updateStatus(false);
      stopHeartbeat();
    };
  }, [user, updateStatus, startHeartbeat, stopHeartbeat]);

  // При закрытии вкладки или перезагрузке – оффлайн
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateStatus(false);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [updateStatus]);
};