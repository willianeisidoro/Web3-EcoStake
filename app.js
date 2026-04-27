// ==========================================
// CONFIG
// ==========================================
const SEPOLIA_CHAIN_ID = 11155111;

const CONTRACTS = {
    NFT: "0xd9Bb2A48068FD31Fae8Bb1AD7b2481fDbbFdC672",
    TOKEN: "0x809bD846dA448d3B1E8F685C381BB3092baa2abB",
    STAKING: "0x354C293da5339E1Fa468ba9ad7263fA840cce3A7",
    DAO: "0xaB57FbaFE1e6f8369DC502699aF03400c5b10144"
};

const PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

const MOCK_TOKEN_URI = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/certificate.json";

const MOCK_PROPOSALS = [
    { id: 1, title: "Reflorestamento Urbano", desc: "Plantio de 1000 árvores nativas em áreas degradadas." },
    { id: 2, title: "Energia Solar Comunitária", desc: "Instalação de painéis solares em centros locais." },
    { id: 3, title: "Reciclagem de E-waste", desc: "Programa de coleta de resíduos eletrônicos." }
];

// ==========================================
// ABIs
// ==========================================
const NFT_ABI = [
    "function mintCertificate(address to, string memory tokenURI) public returns (uint256)"
];

const TOKEN_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function faucet() external"
];

const STAKING_ABI = [
    "function stake(uint256 amount) external",
    "function unstake() external",
    "function calculateReward(address user) public view returns (uint256)",
    "function stakedBalance(address) public view returns (uint256)",
    "function configured() public view returns (bool)",
    "function setConfig(address,address) external"
];

const DAO_ABI = [
    "function vote(uint256 proposalId) external"
];

// ==========================================
let provider, signer, userAddress;

// ==========================================
function showStatus(id, msg, type = 'info') {
    const el = document.getElementById(id);
    el.innerHTML = `<div class="status-message status-${type}">${msg}</div>`;
}

function clearStatus(id) {
    document.getElementById(id).innerText = "";
}

// ==========================================
async function connect() {
    if (!window.ethereum) return alert("Instale o MetaMask");

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        document.getElementById('walletAddress').innerText =
            userAddress.slice(0,6) + "..." + userAddress.slice(-4);

        if (!(await checkNetwork())) return;

        await ensureStakingConfigured();
        enableActions();
        await updateData();
        loadProposals();
    } catch (e) {
        console.error(e);
        alert("Erro ao conectar carteira");
    }
}

// ==========================================
async function checkNetwork() {
    const { chainId } = await provider.getNetwork();
    if (chainId !== SEPOLIA_CHAIN_ID) {
        alert("Troque para a rede Sepolia");
        return false;
    }
    return true;
}

function enableActions() {
    document.getElementById('mintButton').disabled = false;
    document.getElementById('investButton').disabled = false;
    document.getElementById('unstakeButton').disabled = false;
}

// ==========================================
async function ensureStakingConfigured() {
    const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, signer);

    try {
        const configured = await staking.configured();
        if (configured) return;

        showStatus("stakeStatus", "Configurando staking...");

        const tx = await staking.setConfig(CONTRACTS.TOKEN, PRICE_FEED, { gasLimit: 200000 });
        await tx.wait();

        showStatus("stakeStatus", "✅ Staking configurado!", "success");
    } catch (e) {
        console.log("Configuração de owner não necessária ou já feita");
    }
}

// ==========================================
async function updateData() {
    const token = new ethers.Contract(CONTRACTS.TOKEN, TOKEN_ABI, provider);
    const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, provider);

    try {
        const balance = await token.balanceOf(userAddress);
        const staked = await staking.stakedBalance(userAddress);
        const reward = await staking.calculateReward(userAddress);

        document.getElementById("tokenBalance").innerText =
            ethers.utils.formatEther(balance) + " ESG";

        document.getElementById("stakedBalance").innerText =
            ethers.utils.formatEther(staked) + " ESG";

        document.getElementById("estimatedReward").innerText =
            ethers.utils.formatEther(reward) + " ESG";
    } catch (e) {
        console.error("Erro ao atualizar dados:", e);
    }
}

// ==========================================
// FAUCET
// ==========================================
async function getFaucetTokens() {
    clearStatus("stakeStatus");

    try {
        const token = new ethers.Contract(CONTRACTS.TOKEN, TOKEN_ABI, signer);

        showStatus("stakeStatus", "Solicitando tokens ESG...");

        const tx = await token.faucet({ gasLimit: 100000 });
        await tx.wait();

        showStatus("stakeStatus", "✅ Tokens recebidos!", "success");

        await updateData();
    } catch (e) {
        showStatus("stakeStatus", "Erro no faucet: " + (e.reason || e.message), "error");
    }
}

// ==========================================
// NFT
// ==========================================
async function mintNFT() {
    clearStatus("nftStatus");

    try {
        const contract = new ethers.Contract(CONTRACTS.NFT, NFT_ABI, signer);
        showStatus("nftStatus", "Emitindo certificado...");
        
        const tx = await contract.mintCertificate(userAddress, MOCK_TOKEN_URI, { gasLimit: 300000 });

        await tx.wait();

        showStatus("nftStatus", "✅ Certificado NFT criado!", "success");
    } catch (e) {
        showStatus("nftStatus", "Erro ao emitir NFT: " + (e.reason || e.message), "error");
    }
}

// ==========================================
// STAKE
// ==========================================
async function investTokens() {
    const amount = document.getElementById("stakeAmount").value;
    if (!amount || amount <= 0) return alert("Digite um valor válido");

    clearStatus("stakeStatus");

    try {
        const token = new ethers.Contract(CONTRACTS.TOKEN, TOKEN_ABI, signer);
        const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, signer);

        const value = ethers.utils.parseEther(amount);

        showStatus("stakeStatus", "Passo 1/2: Aprovando contrato...");
        const tx1 = await token.approve(CONTRACTS.STAKING, value, { gasLimit: 100000 });
        await tx1.wait();

        showStatus("stakeStatus", "Passo 2/2: Confirmando investimento...");
        const tx2 = await staking.stake(value, { gasLimit: 400000 });
        await tx2.wait();

        showStatus("stakeStatus", "✅ Investimento realizado com sucesso!", "success");
        await updateData();
    } catch (e) {
        showStatus("stakeStatus", "Erro no investimento: " + (e.reason || e.message), "error");
    }
}

// ==========================================
async function unstakeTokens() {
    clearStatus("stakeStatus");

    try {
        const staking = new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, signer);

        showStatus("stakeStatus", "Processando resgate...");
        
        // Unstake costuma falhar se não tiver gás suficiente para o cálculo de rewards
        const tx = await staking.unstake({ gasLimit: 500000 });
        await tx.wait();

        showStatus("stakeStatus", "✅ Resgate concluído!", "success");
        await updateData();
    } catch (e) {
        showStatus("stakeStatus", "Erro ao resgatar: " + (e.reason || e.message), "error");
    }
}

// ==========================================
// DAO
// ==========================================
function loadProposals() {
    const list = document.getElementById("proposalsList");
    list.innerHTML = "";

    MOCK_PROPOSALS.forEach(p => {
        const div = document.createElement("div");
        div.className = "proposal-card";
        div.innerHTML = `
            <div class="proposal-info">
                <h4>${p.title}</h4>
                <p>${p.desc}</p>
            </div>
            <button onclick="vote(${p.id})" class="btn-primary">Votar</button>
        `;
        list.appendChild(div);
    });
}

async function vote(id) {
    clearStatus("daoStatus");

    try {
        const dao = new ethers.Contract(CONTRACTS.DAO, DAO_ABI, signer);
        showStatus("daoStatus", "Enviando voto...");
        
        const tx = await dao.vote(id, { gasLimit: 150000 });

        await tx.wait();

        showStatus("daoStatus", "✅ Voto registrado!", "success");
    } catch (e) {
        showStatus("daoStatus", "Erro ao votar: " + (e.reason || e.message), "error");
    }
}

// ==========================================
// EVENTOS
// ==========================================
document.getElementById("connectButton").onclick = connect;
document.getElementById("mintButton").onclick = mintNFT;
document.getElementById("investButton").onclick = investTokens;
document.getElementById("unstakeButton").onclick = unstakeTokens;
document.getElementById("faucetButton").onclick = getFaucetTokens;

// Expor função vote para o escopo global devido ao uso em onclick no innerHTML
window.vote = vote;
