const GITHUB_USERNAME = 'LunaLynx12';
const GITHUB_REPO = 'test';
const GITHUB_BRANCH = 'main';

document.addEventListener('DOMContentLoaded', function () {
    if (window.location.hash.startsWith('#/wiki/')) {
        loadMarkdownContent();
    } else {
        fetchTeamStructure();
    }
});

async function fetchFolderContents(path) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    return response.json(); // returns an array of items
}

async function fetchTeamStructure() {
    try {
        const teams = await fetchFolderContents('wiki');

        const teamFolders = teams.filter(item =>
            item.type === 'dir' && item.name.match(/^team\d+$/i)
        );

        const teamData = await Promise.all(
            teamFolders.map(async team => {
                const members = await fetchFolderContents(`wiki/${team.name}`);
                return {
                    id: team.name,
                    name: team.name.replace(/^team/, 'Team '),
                    members: members.filter(m => m.type === 'dir')
                };
            })
        );

        renderTeamList(teamData);
    } catch (error) {
        console.error('Error loading team structure:', error);
        renderError('Failed to load team structure. Please try again later.');
    }
}

function renderTeamList(teams) {
    const teamsContainer = document.getElementById('teams-list');
    teamsContainer.innerHTML = '';

    if (teams.length === 0) {
        teamsContainer.innerHTML = '<p>No teams found.</p>';
        return;
    }

    teams.forEach(team => {
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';

        const memberList = team.members.length > 0 ?
            `<ul class="member-list">
                ${team.members.map(member =>
                    `<li>
                        <a href="#/wiki/${team.id}/${member.name}" 
                           data-path="${team.id}/${member.name}">
                            ${member.name}
                        </a>
                    </li>`
                ).join('')}
            </ul>` :
            '<p>No members in this team</p>';

        teamCard.innerHTML = `
            <h3>${team.name}</h3>
            ${memberList}
        `;

        teamsContainer.appendChild(teamCard);
    });

    document.querySelectorAll('.member-list a').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const path = this.getAttribute('data-path');
            window.location.hash = `#/wiki/${path}`;
            loadMarkdownContent();
        });
    });
}

async function loadMarkdownContent() {
    const hash = window.location.hash.substring(1);
    const pathParts = hash.split('/').slice(2);
    const userPath = pathParts.join('/');

    try {
        const files = await fetchFolderContents(`wiki/${userPath}`);
        const markdownFiles = files.filter(file =>
            file.type === 'file' && file.name.endsWith('.md')
        );

        if (markdownFiles.length > 0) {
            await renderMarkdownFile(userPath, markdownFiles[0].name);
        } else {
            renderError('No markdown files found for this user.');
        }
    } catch (error) {
        console.error('Error loading markdown content:', error);
        renderError('Failed to load content. Please try again later.');
    }
}

async function renderMarkdownFile(userPath, filename) {
    const mainContent = document.querySelector('main');
    const breadcrumbPath = generateBreadcrumb([...userPath.split('/'), filename]);

    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/${GITHUB_BRANCH}/wiki/${userPath}/${filename}`;
    const response = await fetch(rawUrl);
    const markdown = await response.text();

    const htmlContent = marked.parse(markdown); // marked.js needed

    mainContent.innerHTML = `
        ${breadcrumbPath}
        <div class="markdown-content">
            ${htmlContent}
            <div class="file-list">
                <h3>Other files in this directory:</h3>
                <ul>
                    ${(await getOtherFiles(userPath, filename)).join('')}
                </ul>
            </div>
        </div>
    `;
}

async function getOtherFiles(userPath, currentFilename) {
    const files = await fetchFolderContents(`wiki/${userPath}`);
    return files
        .filter(file =>
            file.type === 'file' &&
            file.name.endsWith('.md') &&
            file.name !== currentFilename
        )
        .map(file => `
            <li>
                <a href="#/wiki/${userPath}/${file.name}" 
                   data-path="${userPath}/${file.name}">
                    ${file.name}
                </a>
            </li>
        `);
}

function generateBreadcrumb(pathParts) {
    let breadcrumb = '<div class="breadcrumb"><a href="#">Home</a>';
    let currentPath = '';

    pathParts.forEach((part, index) => {
        currentPath += `${part}/`;
        if (index < pathParts.length - 1) {
            breadcrumb += ` / <a href="#/wiki/${currentPath.slice(0, -1)}">${part}</a>`;
        } else {
            breadcrumb += ` / ${part}`;
        }
    });

    breadcrumb += '</div>';
    return breadcrumb;
}

function renderError(message) {
    const mainContent = document.querySelector('main');
    mainContent.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button onclick="window.location.hash=''">Return Home</button>
        </div>
    `;
}

window.addEventListener('hashchange', function () {
    if (window.location.hash.startsWith('#/wiki/')) {
        loadMarkdownContent();
    } else {
        document.querySelector('main').innerHTML = `
            <div class="teams-container">
                <h2>Teams</h2>
                <div id="teams-list" class="teams-grid"></div>
            </div>
        `;
        fetchTeamStructure();
    }
});
