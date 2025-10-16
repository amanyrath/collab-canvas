from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.tools import tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.output_parsers import StrOutputParser


@tool
def web_research(query: str) -> str:
    """
    Performs a web search.
    """
    tool = TavilySearchResults()
    docs = tool.invoke({"query": query})
    web_results = "\n".join([d["content"] for d in docs])

    return web_results


@tool
def write_report(research_data: str) -> str:
    """
    Writes a structured report based on the provided topic and research data.
    """
    writer = ChatOpenAI(model="gpt-4o-mini")
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a writer that writes clear and concise reports on the context you are given. Your audience is business executives.",
            ),
            (   "user", "context: {research_data}"),
        ]
    )
    chain = prompt | writer | StrOutputParser()
    return chain.invoke({"research_data": research_data})


@tool
def save_to_file(report: str, filename: str) -> str:
    """
    Saves the report to a file.
    """
    with open(filename, "w", encoding="utf-8") as file:
        file.write(report)
    return f"Content saved successfully to {filename}"


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.15)

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a research assistant. When the report is written, save it to a file",
        ),
        (   "user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ]
)

tools = [web_research, write_report, save_to_file]
llm_with_tools = llm.bind_tools(tools)

agent = create_tool_calling_agent(llm_with_tools, tools, prompt)

# The agent executor is the runtime for an agent.
# This is what actually calls the agent, executes the actions it chooses, passes the action outputs back to the agent, and repeats.
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

for step in agent_executor.stream(
    {"input": "Write a report analyzing the current price of Bitcoin in February 2025", "agent_scratchpad": ""}
):
    if "output" in step:
        print(step["output"])

# list(
#     agent_executor.stream(
#         {"input": "Write a report about the current spike in the price of Bitcoin in November 2024", "agent_scratchpad": ""}
#     )
# )
