import streamlit as st
import os
import sys
from datetime import date,timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from db import execute


plans = execute(query="SELECT * FROM membership_plans WHERE is_active=1", fetch=True)
plan_names = [p["name"] for p in plans]

with st.form("signup_form"):
    st.subheader("Personal Information")
    
    col1, col2 = st.columns(2)
    with col1:
        first_name = st.text_input("First Name", placeholder="John")
    with col2:
        last_name = st.text_input("Last Name", placeholder="Doe")
    
    email = st.text_input("Email", placeholder="john@example.com")
    
    col3, col4 = st.columns(2)
    with col3:
        phone = st.text_input("Phone", placeholder="555-0123")
    with col4:
        address = st.text_input("Address", placeholder="123 Main St")


    st.markdown("---")

    st.subheader("Choose a Plan")

    selected_plan_name = st.selectbox(
        'Choose a Plan',
        plan_names,
        placeholder="Select Payment Plan"
    )

    

    st.subheader("Available Plans")

    cols = st.columns(len(plans))
    for i, plan in enumerate(plans):
        with cols[i]:
            sessions = plan["session_limit"] if plan["session_limit"] else "Unlimited"
            st.markdown(f"### {plan['name']}")
            st.metric("Price", f"${plan['price']}")
            st.caption(f"Duration: {plan['duration_days']} days")
            st.caption(f"Sessions: {sessions}")
    
    start_date = st.date_input("Start Date", value=date.today())

    st.markdown("---")
    submitted = st.form_submit_button("Sign Up", use_container_width=True)


if submitted:
    selected_plan = next(p for p in plans if p["name"] == selected_plan_name)
    if not first_name or not last_name or not email:
        st.error("Please fill in your first name, last name, and email.")
    else:
        try:
            # Create user
            user_id = execute(
                query="INSERT INTO users (first_name, last_name, email, phone, address, role) VALUES (%s, %s, %s, %s, %s, %s)",
                params=(first_name, last_name, email, phone, address, "client"),
            )

            # Calculate end date
            end_date = start_date + timedelta(days=selected_plan["duration_days"])

            # Create membership
            execute(
                query="INSERT INTO memberships (client_id, plan_id, start_date, end_date, sessions_remaining, status) VALUES (%s, %s, %s, %s, %s, %s)",
                params=(user_id, selected_plan["id"], start_date, end_date, selected_plan["session_limit"], "active"),
            )

            st.success(f"Welcome to Pro Fitness, {first_name}! 🎉")
            st.info(f"**Plan:** {selected_plan_name} | **Starts:** {start_date} | **Ends:** {end_date}")
            st.balloons()

        except Exception as e:
            st.error(f"Something went wrong: {e}")

    
