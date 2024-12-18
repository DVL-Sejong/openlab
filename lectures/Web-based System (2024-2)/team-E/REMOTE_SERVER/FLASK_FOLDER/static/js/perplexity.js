document.getElementById("generate-btn").addEventListener("click", async () => {
            const inputText = document.getElementById("input-text").value.trim();
            const outputDiv = document.getElementById("output");
            const inputDisplay = document.getElementById("input-display");
            const perplexityDisplay = document.getElementById("perplexity-display");
            const generatedDisplay = document.getElementById("generated-display");

            if (!inputText) {
                alert("Please enter some text.");
                return;
            }

            // Fetch API로 서버에 요청 보내기
            try {
                const response = await fetch("/flask/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: inputText })
                });

                if (!response.ok) {
                    throw new Error("Failed to calculate perplexity and generate text.");
                }

                const data = await response.json();

                // 결과 표시
                inputDisplay.textContent = data.input_text;
                perplexityDisplay.textContent = data.perplexity.toFixed(2);
                generatedDisplay.textContent = data.generated_text;

                outputDiv.style.display = "block";
            } catch (error) {
                alert("An error occurred: " + error.message);
                outputDiv.style.display = "none";
            }
        });