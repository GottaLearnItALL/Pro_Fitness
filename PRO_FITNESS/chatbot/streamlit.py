import streamlit as st
import tools


st.title("Pro Fitness")

if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])



def generate_response(input_text):
    st.info(tools.response(input_text))
    return tools.response(input_text)


if prompt := st.chat_input("Hello"):
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role":"user", "content":prompt})

    with st.chat_message("assistant"):
        response = generate_response(prompt)

    st.session_state.messages.append({'role':"assistant", "content":response})



