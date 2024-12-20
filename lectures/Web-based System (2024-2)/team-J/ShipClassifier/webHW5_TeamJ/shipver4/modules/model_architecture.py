import torch.nn as nn
from torchvision import models

class ShipSoundResNet18(nn.Module):
    def __init__(self, num_classes):
        super(ShipSoundResNet18, self).__init__()
        self.resnet18 = models.resnet18(weights=True)
        self.resnet18.conv1 = nn.Conv2d(1, 64, kernel_size=(7, 7), stride=(2, 2), padding=(3, 3), bias=False)
        self.resnet18.fc = nn.Linear(self.resnet18.fc.in_features, num_classes)

    def forward(self, x):
        x = self.resnet18(x)
        return x
