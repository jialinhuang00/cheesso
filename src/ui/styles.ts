export const CHEESSO_STYLES = `
.cheesso-auth-container {
  width: 0;
  position: relative;
  display: inline-block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  flex-direction: column;
}

.cheesso-auth-container.tooltip-active {
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  flex-direction: column;
}

.cheesso-auth-button {
  background: white;
  color: #333;
  border: 2px solid #333;
  border-radius: 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;
  min-width: 24px;
  position: relative;
  transform: rotate(-0.5deg);
  box-shadow: 3px 3px 0px #333;
  padding: 4px 8px;
}

.cheesso-auth-button:hover {
  background: #333;
  color: white;
  transform: rotate(0deg) translateY(-1px);
  box-shadow: 4px 4px 0px #666;
}

.cheesso-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 2px solid #333;
  border-radius: 0;
  box-shadow: 5px 5px 0px #333;
  z-index: 1000;
  min-width: 240px;
  margin-top: 4px;
  opacity: 0;
  transform: translateY(-8px) rotate(-1deg);
  transition: all 0.15s ease;
  pointer-events: none;
}

.cheesso-dropdown.open {
  opacity: 1;
  transform: translateY(0) rotate(0deg);
  pointer-events: auto;
}

.cheesso-dropdown-header {
  padding: 16px;
  border-bottom: 2px solid #333;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  background: #f9f9f9;
}

.cheesso-social-buttons {
  padding: 12px;
}

.cheesso-social-button {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #333;
  border-radius: 0;
  background: white;
  cursor: pointer;
  margin-bottom: 8px;
  font-size: 14px;
  transition: all 0.15s ease;
  transform: rotate(0.3deg);
  box-shadow: 2px 2px 0px #333;
}

.cheesso-social-button:last-child {
  margin-bottom: 0;
}

.cheesso-social-button:hover {
  background: #333;
  color: white;
  transform: rotate(0deg) translateX(2px);
  box-shadow: 3px 3px 0px #666;
}

.cheesso-social-button .icon {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.cheesso-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  padding: 6px 16px 6px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cheesso-user-info:hover {
  background: #f8f9fa;
  border-color: #dadce0;
}

.cheesso-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 0;
  background: white;
  border: 2px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s ease;
  transform: rotate(-2deg);
  box-shadow: 2px 2px 0px #333;
}

.cheesso-user-avatar:hover {
  transform: rotate(0deg) scale(1.05);
  box-shadow: 3px 3px 0px #333;
}

.cheesso-user-avatar:active {
  transform: rotate(-1deg) scale(0.98);
}

.cheesso-auth-container.tooltip-active .cheesso-user-avatar {
  flex-shrink: 0;
}

.cheesso-user-email {
  font-size: 14px;
  color: #333;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cheesso-user-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 200px;
  margin-top: 4px;
  opacity: 0;
  transform: translateY(-8px);
  transition: all 0.2s ease;
  pointer-events: none;
}

.cheesso-user-menu.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.cheesso-menu-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background 0.2s ease;
}

.cheesso-menu-item:hover {
  background: #f8f9fa;
}

.cheesso-menu-item.danger {
  color: #d93025;
}

.cheesso-loading {
  opacity: 0.6;
  pointer-events: none;
}

.cheesso-error {
  position: fixed;
  top: 24px;
  right: 24px;
  background: #eb4254;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 3px 8px rgba(235, 66, 84, 0.3);
  z-index: 10000;
  max-width: 320px;
  text-align: left;
  animation: cheesso-snackbar-enter 0.3s ease-out;
}

.cheesso-error.fadeout {
  animation: cheesso-snackbar-exit 0.5s ease-in forwards;
}

@keyframes cheesso-snackbar-enter {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes cheesso-snackbar-exit {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* Social provider icons */
.cheesso-social-button .icon.google {
  background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwLjIgOC4xVjEySDEzLjhDMTMuNiAxMy4xIDEyLjggMTQuIDExLjUgMTQuN0wxNC40IDE2LjlDMTYuMSAxNS40IDE3IDE0IDE3IDEwLjJWOS43SDE3QzE3IDkuNyAxNi4zIDkuNiAxNiA5LjZIMTAuMlY4LjFaIiBmaWxsPSIjNDI4NUY0Ii8+CjxwYXRoIGQ9Ik0xMC4yIDguMVYxMkgxMy44QzEzLjYgMTMuMSAxMi44IDE0IDExLjUgMTQuN0wxNC40IDE2LjlDMTYuMSAxNS40IDE3IDE0IDE3IDEwLjJWOS43SDE3QzE3IDkuNyAxNi4zIDkuNiAxNiA5LjZIMTAuMlY4LjFaIiBmaWxsPSIjNDI4NUY0Ii8+Cjwvc3ZnPgo=') center/contain no-repeat;
}

.cheesso-social-button .icon.apple {
  background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iIzAwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEzLjUgNEM0IDE2IDQuNSAyIDEwIDIuNUMxMy41IDMgMTQgMCAxMi41IDIuNUMxMS41IDMuNSAxMS41IDQuNSAxMy41IDRaTTExIDVDMTAuNSA1IDEwIDUuNSAxMCA2QzEwIDYuNSAxMC41IDcgMTEgN0MxMS41IDcgMTIgNi41IDEyIDZDMTIgNS41IDExLjUgNSAxMSA1WiIvPgo8L3N2Zz4K') center/contain no-repeat;
}

.cheesso-social-button .icon.microsoft {
  background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iI0Y0NUUwMCIvPgo8cmVjdCB4PSIxMSIgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iIzAwQkM2QyIvPgo8cmVjdCB5PSIxMSIgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iIzAwNzhENCIvPgo8cmVjdCB4PSIxMSIgeT0iMTEiIHdpZHRoPSI5IiBoZWlnaHQ9IjkiIGZpbGw9IiNGRkIwMDAiLz4KPC9zdmc+') center/contain no-repeat;
}

.cheesso-social-button .icon.github {
  background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iIzMzMzMzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDJBOCA4IDAgMCAwIDIgMTBBOCA4IDAgMCAwIDkuOSAxOS45QzEwLjYgMjAgMTEgMTkuNiAxMSAxOS4yVjE3LjhDNy44IDE4LjQgNy4xIDE2LjQgNy4xIDE2LjRDNi42IDE1LjIgNS44IDE0LjggNS44IDE0LjhDNC43IDE0LjIgNS45IDE0LjIgNS45IDE0LjJDNy4xIDE0LjMgNy43IDE1LjUgNy43IDE1LjVDOC44IDE3LjMgMTAuNyAxNi45IDExLjIgMTYuNkMxMS4zIDE1LjkgMTEuNiAxNS41IDEyIDE1LjJDOS41IDE0LjkgNi44IDEzLjkgNi44IDEwQzYuOCA5IDcuMSA4LjIgNy43IDcuNkM3LjYgNy4zIDcuMiA2LjIgNy44IDQuN0M3LjggNC43IDguOSA0LjMgMTAuOSA1LjZDMTEuNiA1LjQgMTIuNCA1LjMgMTMuMiA1LjNDMTQgNS4zIDE0LjggNS40IDE1LjUgNS42QzE3LjUgNC4zIDE4LjYgNC43IDE4LjYgNC43QzE5LjIgNi4yIDE4LjggNy4zIDE4LjcgNy42QzE5LjMgOC4yIDE5LjYgOSAxOS42IDEwQzE5LjYgMTMuOSAxNi45IDE0LjkgMTQuNCAyNS4yQzE0LjggMTUuNSAxNS4xIDE1LjkgMTUuMiAxNi42QzE1LjIgMTYuOSAxNi4zIDE3LjMgMTYuMyAxOC44VjE5LjJDMTYuMyAxOS42IDE2LjcgMjAgMTcuNCAyMEM3IDE5LjkgMTggMTAgMTggMTBBOCA4IDAgMCAwIDEwIDJaIi8+Cjwvc3ZnPg==') center/contain no-repeat;
}

/* User tooltip styles */
.cheesso-user-tooltip {
  position: static;
  background: #fafafa;
  color: #333;
  border-radius: 0;
  height: 0;
  border: 3px solid #333;
  box-shadow: 5px 5px 0px #333;
  z-index: 2000;
  min-width: 320px;
  max-width: 450px;
  max-height: 80vh;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.95) translateY(-10px) rotate(-1deg);
  transition: all 0.2s ease;
  pointer-events: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  overflow-y: auto;
  margin-top: 8px;
}

.cheesso-user-tooltip.show {
  opacity: 1;
  height: auto;
  padding: 16px;
  visibility: visible;
  transform: scale(1) translateY(0) rotate(0deg);
}

.cheesso-user-tooltip-header {
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 2px solid #333;
}

.cheesso-logout-btn {
  background: white;
  color: #333;
  border: 2px solid #333;
  border-radius: 0;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  transform: rotate(1deg);
  box-shadow: 1px 1px 0px #333;
}

.cheesso-logout-btn:hover {
  background: #333;
  color: white;
  transform: rotate(0deg);
  box-shadow: 2px 2px 0px #666;
}

.cheesso-user-tooltip-content {
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.cheesso-user-tooltip .json-key {
  color: #000;
  font-weight: 600;
}

.cheesso-user-tooltip .json-string {
  color: #333;
  font-style: italic;
}

.cheesso-user-tooltip .json-number {
  color: #666;
  font-weight: 500;
}

.cheesso-user-tooltip .json-boolean {
  color: #000;
  text-decoration: underline;
}

.cheesso-user-tooltip .json-null {
  color: #999;
  text-decoration: line-through;
}

/* Custom scrollbar for tooltip */
.cheesso-user-tooltip::-webkit-scrollbar {
  width: 8px;
}

.cheesso-user-tooltip::-webkit-scrollbar-track {
  background: #f0f0f0;
  border: 1px solid #333;
}

.cheesso-user-tooltip::-webkit-scrollbar-thumb {
  background: #333;
  border: 1px solid #333;
}

.cheesso-user-tooltip::-webkit-scrollbar-thumb:hover {
  background: #666;
}
`;

let stylesInjected = false;

export function injectStyles(): void {
  if (stylesInjected) return;

  const styleElement = document.createElement('style');
  styleElement.textContent = CHEESSO_STYLES;
  styleElement.id = 'cheesso-styles';
  document.head.appendChild(styleElement);

  stylesInjected = true;
}

export function removeStyles(): void {
  const existingStyles = document.getElementById('cheesso-styles');
  if (existingStyles) {
    existingStyles.remove();
    stylesInjected = false;
  }
}