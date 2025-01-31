/**
 * RUNS IN DOM Injected by extension
 */
document.addEventListener("DOMContentLoaded", function () {
    const backgroundArray = [];
    let previousBackgrounds = new Map(); 
    let backgroundMap = new Map();

    // Utility function to generate UUID
    function generateSimpleUUID() {
        const timestamp = Date.now();
        const randomNumber = Math.floor(Math.random() * 0xFFFFFFFFFFFFFFFF);
        return `${timestamp.toString(16)}-${randomNumber.toString(16)}`;
    }

    // Function to remove old background styles for the split-view
    function removeOldStyles({ styleTag, splitViewId, index }) {
				if (!styleTag){
					return
				}
        const styleRegex = new RegExp(`\\/\\* ${splitViewId} \\*\\/([\\s\\S]*?)\\/\\* end-${splitViewId} \\*\\/`, "g");
        const oldStyles = styleTag.innerHTML.match(styleRegex);
        if (oldStyles) {
            console.log(`🗑️ Removing old styles for split-view ${splitViewId} ${index}`);
            styleTag.innerHTML = styleTag.innerHTML.replace(styleRegex, "");
        }
    }

    // Function to apply the background style to a split-view container
    function applyBackgroundStyle({ styleTag, splitViewId, dataUri, matchedBackground, monacoEditorElement }) {
        let backgroundImage = '';
        let additionalStyles = '';

        if (typeof matchedBackground === 'string') {
            backgroundImage = `background-image: url('${matchedBackground}')!important;`;
        } else if (typeof matchedBackground === 'object') {
						console.log('matchedBackground object!');
            if (matchedBackground.url) {
                backgroundImage = `background-image: url('${matchedBackground.url}')!important;`;
            }
            additionalStyles = Object.entries(matchedBackground)
                .filter(([key]) => key !== 'url')
                .filter(([key]) => key !== 'pattern')
                .map(([key, value]) => `${key}: ${value};`)
                .join(' ');
        }

        const newStyleContent = `
/* ${splitViewId} */
.minimap{opacity:0.8;} 
[id='workbench.parts.editor'] .split-view-view[data-splitview-id='${splitViewId}'] .editor-container .overflow-guard>.monaco-scrollable-element>.monaco-editor-background{background:none;} 
[id='workbench.parts.editor'] .split-view-view[data-splitview-id='${splitViewId}'] .editor-instance>.monaco-editor[data-uri='${dataUri}'] .overflow-guard>.monaco-scrollable-element::after {
    content: '';
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 99;
    pointer-events: none;
    transition: 0.3s;
    background-repeat: no-repeat;
    background-position: 100% 100%;
    background-size: 100px auto;
    opacity: 0.6;
    ${backgroundImage}
    ${additionalStyles}
}
/* end-${splitViewId} */
        `;

        styleTag.innerHTML += newStyleContent;
        console.log(`✅ Background applied to split-view ${splitViewId}.`);
        previousBackgrounds.set(monacoEditorElement, matchedBackground);
    }

    // Function to match background based on config
    function matchBackground(dataUri) {
        for (const [pattern, object] of backgroundMap) {
					try {
						const regex = new RegExp(pattern);
						if (regex.test(dataUri)) {
							return object;
						}
					} catch (e) {
						if (dataUri.includes(pattern)) {
							return object;
						}
					}
        }
        return null;
    }

    function updateEditorBackground() {
        let styleTag = document.getElementById("editor-background-style");
        const editorContainers = document.querySelectorAll('.editor .monaco-scrollable-element .split-view-container > .split-view-view ');

        if (!editorContainers.length) {
            return;
        }

        editorContainers.forEach((editorContainer, index) => {
            if (!editorContainer.dataset.splitviewId) {
                editorContainer.dataset.splitviewId = generateSimpleUUID();
            }

            const splitViewId = editorContainer.dataset.splitviewId;
            const firstLevel = editorContainer.querySelector('.editor-group-container .empty');
            if (firstLevel && firstLevel.parent === editorContainer) {
                removeOldStyles({ styleTag, splitViewId, index });
                return;
            }

            const monacoEditorElement = editorContainer.querySelector(".monaco-editor");
            if (!monacoEditorElement) {
                removeOldStyles({ styleTag, splitViewId, index });
                return;
            }

            const dataUri = monacoEditorElement.getAttribute("data-uri");
            if (!dataUri) {
                removeOldStyles({ styleTag, splitViewId, index });
                return;
            }

            const matchedBackground = matchBackground(dataUri);

            if (!matchedBackground) {
                removeOldStyles({ styleTag, splitViewId, index });
                return;
            }

            if (previousBackgrounds.get(monacoEditorElement) !== matchedBackground) {
                if (!styleTag) {
                    styleTag = document.createElement("style");
                    styleTag.id = "editor-background-style";
                    document.head.appendChild(styleTag);
                    console.log("📄 Created new <style> tag for editor background.");
                }

                removeOldStyles({ styleTag, splitViewId, index });
                applyBackgroundStyle({ styleTag, splitViewId, dataUri, matchedBackground, monacoEditorElement });
            }
        });
    }

    function generateBackgroundMap() {
			backgroundMap = new Map();
			for (const object of backgroundArray) {
				backgroundMap.set(object.pattern, object);
			}
    }

    generateBackgroundMap();
    updateEditorBackground();

    const observer = new MutationObserver(() => {
        updateEditorBackground();
    });

    setTimeout(() => {
        const editorElement = document.querySelector('.editor');
        observer.observe(editorElement, { childList: true, subtree: true });
        console.log("👀 MutationObserver initialized to track changes in the DOM.");
    }, 1000);
});
