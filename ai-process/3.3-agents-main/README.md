# Week 3.3 Agents

## Introduction
AI agents use LLMs to generate reasoning steps and select actions in sequence, enabling them to make decisions and solve complex tasks through dynamic interaction with their environment.

## Prerequisites
- Docker (containerized setup - recommended)
- Python 3.11 or greater (Python virtual environment setup)

## Class Slides
[Slides 3.3](https://docs.google.com/presentation/d/1rFHWzdaFI_h18E-9jLKy2GaTwqO8Bl-_D3243JMpNtQ/edit?usp=sharing)

## Setup and Execution

### Get a Tavily API Key
- Create a free Tavily API key [here](https://tavily.com/)

### Set up environment variables:
- Copy the sample environment file:
  ```
  cp .env.sample .env
  ```
- Edit the `.env` file and add your API keys:
  ```
   OPENAI_API_KEY=your-openai-key
   LANGCHAIN_API_KEY=your-langchain-key
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_PROJECT=week_3_3
   TAVILY_API_KEY=your-tavily-key
  ```
## Docker
1. Run the research_agent.py file:
   ```
   docker compose run --rm main python in_class_examples/research_agent.py
   ```
2. Start Jupyter to run the .ipynbfiles as local notebooks (best way to run the notebooks)
   ```
   docker compose up jupyter
   ```
3. Run a specific script (any new `.py` file you may add):
   ```
   docker compose run --rm main python <script_name.py>
   ```

Note: The Docker setup will automatically use the environment variables from your `.env` file. You don't need to export them to your system environment when using Docker.

## Running Different Scripts
You can use the provided `run.sh` script for easier execution.
Make sure to make the script executable with `chmod +x run.sh` in the CLI before using:
```
./run.sh main
./run.sh jupyter
./run.sh <your_new_py_file>
```
## Local Setup (Alternative to Docker)
If you prefer to run the examples locally:

1. Ensure you have Python 3.11.0 or higher installed.
2. Clone the repository:
    ```
    git clone [repository-url]
    cd [repository-name]
    ```
3. Set up the virtual environment:
    ```
    python3 -m venv .venv
    source .venv/bin/activate  # On Windows use `.venv\Scripts\activate`
    pip install -r requirements.txt
    ```
4. Configure environment variables as described in the Setup section.
5. export your `.env` variables to the system:

   **Linux / Mac / Bash**
    ```
    export $(grep -v '^#' .env | xargs)
    ```
6. Run the script:
    ```
    python3 in_class_examples/research_agent.py

    run the ipynb files in VSCode (it will prompt you to allow the installation of ipykernel: do so) or other IDEs that support Jupyter Notebooks
    ```

## Need Help?
Reach out to the learning assistant
