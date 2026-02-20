from setuptools import setup, find_packages
import os

# Read the long description from README.md
this_directory = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(this_directory, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

setup(
    name="Aegis-V",  # Matches the pip install Aegis-V command
    version="1.0.2",
    packages=find_packages(),
    description="Aegis V - Neural Interface SDK for LLM Security",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Aegis Security",
    author_email="hello@aegis.com",
    url="https://github.com/yourusername/aegis-v",  # Update with your actual repo
    install_requires=[
        "requests>=2.25.1",
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Security",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
)
